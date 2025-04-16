import Post from "../models/Post.js";
import User from "../models/User.js";
import supabase from "../lib/supabaseClient.js";
import { v4 as uuidv4 } from "uuid";

/* CREATE */
export const createPost = async (req, res) => {
  try {
    const { userId, description, picturePath } = req.body;

    const file = req.file;
    let imageUrl = "";

    if (file) {
      const filename = `posts/${uuidv4()}_${file.originalname}`;

      const { data, error } = await supabase.storage
        .from("user-data")
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: publicURL } = supabase.storage
        .from("user-data")
        .getPublicUrl(filename);

      imageUrl = publicURL.publicUrl;
    }

    const user = await User.findById(userId);
    const newPost = new Post({
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      location: user.location,
      description,
      userPicturePath: user.picturePath,
      picturePath: imageUrl,
      likes: {},
      comments: [],
    });
    await newPost.save();

    const post = await Post.find();
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(409).json({ message: err.message });
  }
};

/* READ */
export const getFeedPosts = async (req, res) => {
  try {
    const posts = await Post.find();
    res.status(200).json(posts);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ userId });
    res.status(200).json(posts);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

/* UPDATE */
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const post = await Post.findById(id);
    const isLiked = post.likes.get(userId);

    if (isLiked) {
      post.likes.delete(userId);
    } else {
      post.likes.set(userId, true);
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { likes: post.likes },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};
