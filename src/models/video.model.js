import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const VideoSchema = new Schema(
  {
    videofile: {
      type: String, //cloudnary url
      required: true,
    },
    thumnail: {
      type: String, //cloudnary url
      required: true,
    },
    tittle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number, //cloudnary url
      default: 0,
    },
    isPublished: {
      type: Boolean, //cloudnary url
      default: true,
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
  },
  {
    timestamps: true,
  }
);
VideoSchema.plugin(mongooseAggregatePaginate)
export const Video=mongoose.model("Video",VideoSchema)
