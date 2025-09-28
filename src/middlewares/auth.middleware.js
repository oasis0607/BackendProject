

import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { wrapAsync } from "../utils/wrapAsync.js";
import jwt from "jsonwebtoken";

export const verifyJWT=wrapAsync(async(req,res,next)=>{
    try{
       const token =req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    if(!token){
        throw new ApiError(401,"Unauthorized request");
    }
    const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
    const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
    if(!user){
        throw new ApiError(401,"Invalid Access token")
    }
    req.user=user;
    next();
    }catch(err){
         console.error("JWT verification failed:", err.message);
        throw new ApiError(401, err.message || "Invalid access token");
    }
})