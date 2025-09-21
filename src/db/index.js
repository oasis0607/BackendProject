import mongoose from "mongoose";

const connectDB=async()=>{
    try{
      const connectionInstance= await mongoose.connect(process.env.MONGO_URL)
      console.log("Connected successfully");
    }catch(err){
        console.log("Mongodb connection error",err);
        process.exit(1);
    }
}
export default connectDB;