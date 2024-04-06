import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { UploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Jwt } from "jsonwebtoken";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //check mat karo before save

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Access and Refresh Tokens"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  // res.status(200).json({
  //   message: "Nayan Banna",
  // });
  //1)get user detail from frontend
  //2)validation - not empty
  //3)check if user already exist: username, email
  //4)check for images,check for avatar
  //5)upload them to cloudinary,avatar
  //6)create user object -create entry in db
  //7)remove  password and refreshtoken field from response
  //8)check for user creation
  //9)return res

  //1)get user detail from frontend
  const { username, fullName, email, password } = req.body;
  // console.log("email :- ",email);

  //2)validation - not empty
  // if(fullName===""){
  //   throw new ApiError(400,"Full Name is Required")
  // }
  // console.log("console of req.body :-",req.body)
  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are Required");
  }

  //3)check if user already exist: username, email
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }
  // console.log("console of req.files :- ", req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  //4)check for images,check for avatar
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is Requireds");
  }
  //5)upload them to cloudinary,avatar
  const avatar = await UploadOnCloudinary(avatarLocalPath);
  const coverImage = await UploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is Requireds");
  }
  //6)create user object -create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  //7)remove  password and refreshtoken field from response
  const CreatedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //8)check for user creation
  if (!CreatedUser) {
    throw new ApiError(500, "Something went wrong while Registring the User");
  }
  //9)return res
  return res
    .status(201)
    .json(new ApiResponse(200, CreatedUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //1)req body ->data
  //2)username or email check
  //3)find the user
  //4)password check
  //5)access and refresh token
  //6)send cookie

  //1)req body ->data
  const { email, username, password } = req.body;
  //2)username or email check
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }
  //3)find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User not exists");
  }
  //4)password check
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password !");
  }
  //5)access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  //6)send cookie
  const loggedInUser = await User.findById(user._id);
  //these options are used to secure i.e. from frontend we cant modify these cookies but we can see them
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User LoggesIn Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User loggedOut"));
});

const refressAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized User Request");
  }
  try {
    const decodedToken = Jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "refreshToken is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, NewRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res.status
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", NewRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: NewRefreshToken },
          "AccessToken Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid RefreshToken");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = User.findById(req.user?._id);
  const IsPasswordCorrect = user.isPasswordCorrect(oldPassword);
  if (!IsPasswordCorrect) {
    throw new ApiError(400, "Invalid oldPassword");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current User fetched Successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are Required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName: fullName, email: email } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detailed updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarlocalPath = req.file?.path;
  if (!avatarlocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await UploadOnCloudinary(avatarlocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading file of avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Uploaded Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImagelocalPath = req.file?.path;
  if (!coverImagelocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const coverImage = await UploadOnCloudinary(coverImagelocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading file of avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage Uploaded Successfully"));
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refressAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
