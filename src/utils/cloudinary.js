import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localPath) => {
  try {
    if (!localPath) return null;

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: "auto", // ✅ fixed typo
    });

    console.log("File uploaded to Cloudinary:", result.url);

    // cleanup local file after successful upload
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // cleanup even if failed
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    return null;
  }
};

export { uploadOnCloudinary };
