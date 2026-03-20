import Lead from '../models/Lead.js';

export const createLead = async (req, res) => {
    try {
        const { user, name, email, serviceName, cost, documents } = req.body;
        console.log(`[LeadController] Creating lead for ${email}. Documents:`, documents?.length || 0);

        const newLead = new Lead({
            user: user || null,
            name,
            email,
            serviceName,
            cost: cost || 1000,
            documents: Array.isArray(documents) ? documents : []
        });

        await newLead.save();
        res.status(201).json({ success: true, message: 'Interest recorded effectively', lead: newLead });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ success: false, message: 'Server Error recording interest' });
    }
};

export const getLeads = async (req, res) => {
    try {
        const { userId } = req.query;
        let query = {};
        if (userId) query.user = userId;

        const leads = await Lead.find(query)
            .populate('user', 'name email profile')
            .sort({ createdAt: -1 });
        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id).populate('user', 'name email profile');
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        res.status(200).json(lead);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updatedAt: Date.now() };

        if (updateData.status === 'DraftSent' || updateData.status === 'Completed') {
            const existingLead = await Lead.findById(id);
            if (!existingLead) {
                return res.status(404).json({ success: false, message: 'Lead not found' });
            }

            const pushedDocuments = req.body?.$push?.documents;
            const currentDocuments = Array.isArray(existingLead.documents) ? existingLead.documents : [];
            const incomingDocuments = pushedDocuments ? [pushedDocuments] : [];
            const allDocuments = [...currentDocuments, ...incomingDocuments];

            if (updateData.status === 'DraftSent') {
                const hasDraft = allDocuments.some((doc) => doc?.type === 'Draft');
                if (!hasDraft) {
                    return res.status(400).json({ success: false, message: 'Draft must be uploaded before sending it to user.' });
                }
            }

            if (updateData.status === 'Completed') {
                const hasFinal = allDocuments.some((doc) => doc?.type === 'Final');
                if (!hasFinal) {
                    return res.status(400).json({ success: false, message: 'Final return must be uploaded before completing service.' });
                }
            }
        }

        // If it's a $push operation (from frontend mock)
        let updatedLead;
        if (req.body.$push) {
            updatedLead = await Lead.findByIdAndUpdate(
                id,
                { $push: req.body.$push, updatedAt: Date.now() },
                { new: true }
            );
        } else {
            updatedLead = await Lead.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            );
        }

        if (!updatedLead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.status(200).json({ success: true, lead: updatedLead });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ success: false, message: 'Error updating lead' });
    }
};

export const updateDocumentStatus = async (req, res) => {
    try {
        const { leadId, docId } = req.params;
        const { status } = req.body;

        if (!['Pending', 'Accepted', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        const doc = lead.documents.id(docId);
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

        doc.status = status;
        lead.updatedAt = Date.now();
        await lead.save();

        res.status(200).json({ success: true, lead });
    } catch (error) {
        console.error('Error updating document status:', error);
        res.status(500).json({ success: false, message: 'Error updating document status' });
    }
};
