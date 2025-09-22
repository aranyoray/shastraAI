module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const entities = {
    doc_id: "demo-doc",
    parties: [
      "John Smith (Landlord)",
      "Jane Doe (Tenant)", 
      "ABC Property Management LLC (Property Manager)"
    ],
    amounts: [
      "$2,500.00 monthly rent",
      "$5,000.00 security deposit",
      "$50.00 late fee per occurrence"
    ],
    dates: [
      "January 1, 2024 (Lease Start)",
      "December 31, 2024 (Lease End)",
      "First of each month (Rent Due)"
    ],
    terms: [
      "12-month lease agreement",
      "No smoking policy",
      "Pet allowance with deposit"
    ]
  };

  res.status(200).json(entities);
};
