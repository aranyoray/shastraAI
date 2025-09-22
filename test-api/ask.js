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

  const { doc_id, q } = req.body;
  
  let answer = "I can help you understand this legal document!";
  
  if (q && q.toLowerCase().includes('rent')) {
    answer = "The monthly rent is **$2,500.00** and is due on the **first of each month** [Source: Lease Terms, Section 3.1].";
  } else if (q && q.toLowerCase().includes('deposit')) {
    answer = "The security deposit is **$5,000.00** and must be paid before move-in [Source: Security Deposit, Section 4.1].";
  }

  res.status(200).json({
    answer: answer,
    hits: [1, 2, 3],
    doc_id: doc_id
  });
};
