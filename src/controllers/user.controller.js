import { wrapAsync } from "../utils/wrapAsync.js";

const registerUser=wrapAsync (async(req,res)=>{
    res.status(200).json({message:"Ok"});
});

export {registerUser};