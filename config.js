module.exports = async function handler(req, res) {
  return res.status(200).json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  });
};
