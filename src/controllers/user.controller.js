import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { UploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"
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
  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(409, "All fields are Required");
  }

  //3)check if user already exist: username, email
  User.findOne({
    $or: [{ username }, { email }],
  });

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
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
  const user=User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  //7)remove  password and refreshtoken field from response
  const CreatedUser=await user.findById(User._id).select("-password -refreshToken");
  //8)check for user creation
  if(!CreatedUser){
    throw new ApiError(500,"Something went wrong while Registring the User")
  }
  //9)return res
  return res.status(201).json(
    new ApiResponse(200,CreatedUser,"User Registered Successfully")
  )
});

export { registerUser };
