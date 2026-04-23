const fs = require('fs');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');

let cloudinary = null;

try {
  cloudinary = require('../config/cloudinary');
} catch (error) {
  cloudinary = null;
}

const uploadToCloudinary = async (filePath) => {
  if (cloudinary && cloudinary.uploader && typeof cloudinary.uploader.upload === 'function') {
    const result = await cloudinary.uploader.upload(filePath);
    return result.secure_url;
  }

  return filePath;
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, { statusCode: 400, message: 'File tidak ada' });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendError(res, { statusCode: 404, message: 'User tidak ditemukan' });
    }

    const uploadedUrl = await uploadToCloudinary(req.file.path);
    user.profilePicture = uploadedUrl;
    await user.save();

    if (uploadedUrl !== req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return sendSuccess(res, {
      message: 'Upload berhasil',
      data: user.profilePicture
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal upload: ' + err.message
    });
  }
};
