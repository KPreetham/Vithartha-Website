import { v2 as cloudinary } from 'cloudinary';

// Dummy config to just generate URLs
cloudinary.config({
  cloud_name: 'dxcrkpgom',
  api_key: '1234567890',
  api_secret: 'abcdefg1234567'
});

const publicId = 'vithartha_documents/nithinarcade2005_gmail.com/1777995832023-1-2d_rocket_launch_simulation_4sf23cs132_-_4sf23cs007_2';
const resolvedDocumentUrl = 'https://res.cloudinary.com/dxcrkpgom/image/authenticated/s--_UeWdSf6--/v1777995836/vithartha_documents/nithinarcade2005_gmail.com/1777995832023-1-2d_rocket_launch_simulation_4sf23cs132_-_4sf23cs007_2.pdf';

const buildSignedUrl = (resourceType = "auto", deliveryType = "authenticated", format = null) => {
  const options = {
    sign_url: true,
    type: deliveryType,
    secure: true,
    resource_type: resourceType,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };
  if (format) options.format = format;
  return cloudinary.url(publicId, options);
};

console.log("image + format:", buildSignedUrl("image", "authenticated", "pdf"));
console.log("raw:", buildSignedUrl("raw", "authenticated"));
console.log("auto:", buildSignedUrl("auto", "authenticated"));
