import { v2 as cloudinary} from "cloudinary";
import fs from 'fs'
import dotenv from 'dotenv'
import { response } from "express";

dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary=async (localPath)=>{
    try{
      if(!localPath) return null;

      //upload file on cloudinary
      const response=await cloudinary.v2.uploader.upload(localPath,{
        resourse_type:"auto",
      })
       console.log("file is uploaded on cloudinary",response.url);
      return response;
    }catch(err){
       fs.unlinkSync(localPath);//remove the locally saved temporary
       //file as the upload operation got failed
       //if we keep this file it occupies server spacce and load
       //also can store currupted files
       return null;
    }
}
cloudinary.uploader
.upload("dog.mp4", {
  resource_type: "video", 
  public_id: "my_dog",
  overwrite: true, 
  notification_url: "https://mysite.example.com/notify_endpoint"})
.then(result=>console.log(result));

export {uploadOnCloudinary};

