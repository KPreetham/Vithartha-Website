import Service from "../models/Service.js";

export const getServices = async (req, res) => {
  try {
    const services = await Service.find({}).sort({ title: 1 });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findOne({ id: req.params.id });
    if (!service)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
