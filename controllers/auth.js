import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import supabase from "../lib/supabaseClient.js";
import { v4 as uuidv4 } from "uuid";

/* REGISTER USER */
export const register = async (req, res) => {
  try {
    const file = req.file;
    let imageUrl = "";

    if (file) {
      const filename = `profile/${uuidv4()}_${file.originalname}`;

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

    const {
      firstName,
      lastName,
      email,
      password,
      picturePath,
      friends,
      location,
      occupation,
    } = req.body;

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: passwordHash,
      picturePath: imageUrl,
      friends,
      location,
      occupation,
      viewedProfile: Math.floor(Math.random() * 10000),
      impressions: Math.floor(Math.random() * 10000),
    });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* LOGGING IN */
export const login = async (req, res) => {
  try {
    console.log("this is login reqeyst");
    const { email, password } = req.body;
    console.log(email, password);
    const user = await User.findOne({ email: email });
    if (!user) return res.status(400).json({ msg: "User does not exist. " });

    const isMatch = bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials. " });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    delete user.password;
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
