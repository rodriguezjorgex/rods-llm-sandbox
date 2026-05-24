export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(400).send('Use POST to run code.');
  }

  // 1. Grab the auth token from the incoming request headers
  const incomingToken = request.headers['x-api-key'];
  
  // 2. Compare it to a secret variable stored securely in your Vercel Dashboard
  const secretToken = process.env.MY_SECRET_SANDBOX_KEY;

  if (!incomingToken || incomingToken !== secretToken) {
    // Instantly reject the attacker with a 401 Unauthorized error
    return response.status(401).json({ error: 'Unauthorized. Keep out.' });
  }

  try {
    const { code } = request.body;
    if (!code) {
      return response.status(400).json({ error: 'No code provided.' });
    }

    const logs = [];
    const customConsole = {
      log: (...args) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      }
    };

    const runner = new Function('console', `
      try {
        ${code}
      } catch (err) {
        throw err;
      }
    `);

    const result = runner(customConsole);

    return response.status(200).json({
      success: true,
      output: logs.join('\n'),
      returnedValue: typeof result !== 'undefined' ? String(result) : null
    });

  } catch (error) {
    return response.status(200).json({
      success: false,
      error: error.message || 'An execution error occurred'
    });
  }
}
