import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const UploadOnCloudinary = async function (localFilePath) {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log("file is upload on cloudinary", response.url);
    fs.unlinkSync(localFilePath)
    return response;
  } 
  catch (error) {
    fs.unlinkSync(localFilePath)//remove the locally saved temporary file as the upload
    return null; 
  }
};

export {UploadOnCloudinary}
//write program for fibonacci series
