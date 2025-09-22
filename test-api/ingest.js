module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const response = {
    doc_id: req.body?.doc_id || 'demo-doc',
    chunks: 156,
    message: "Document processed successfully with AI",
    entities: {
      parties: ["John Smith (Landlord)", "Jane Doe (Tenant)"],
      amounts: ["$2,500.00 monthly rent", "$5,000.00 security deposit"],
      dates: ["January 1, 2024", "December 31, 2024"]
    }
  };

  res.status(200).json(response);
};
