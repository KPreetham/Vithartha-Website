import Service from "../models/Service.js";
import User from "../models/User.js";

export const getRecommendations = async (req, res) => {
  const { businessStage, needs, urgency } = req.body;

  try {
    // Recommendation logic
    let filter = {};
    if (businessStage === "Startup") {
      filter.tags = { $in: ["startup", "incorporation", "registration"] };
    } else if (businessStage === "Growing") {
      filter.tags = { $in: ["gst", "income-tax", "compliance", "scaling"] };
    } else if (businessStage === "Established") {
      filter.tags = { $in: ["cfo", "accounting", "advisory", "audit"] };
    }

    // Combine with specific needs if provided
    if (needs && needs.length > 0) {
      filter.tags = {
        ...filter.tags,
        $in: [...(filter.tags?.$in || []), ...needs],
      };
    }

    const recommendedServices = await Service.find(filter);

    res.status(200).json({
      success: true,
      data: recommendedServices,
      summary: `Found ${recommendedServices.length} services tailored for your ${businessStage} business.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
