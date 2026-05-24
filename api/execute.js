export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(400).send('Use POST to run code.');
  }

  // 1. Grab the auth token from the incoming request headers
  const incomingToken = request.headers['x-api-key'];
  
  // 2. Compare it to a secret variable stored securely in your Vercel Dashboard
  const secretToken = process.env.MY_SECRET_SANDBOX_KEY;

  if (!incomingToken || incomingToken !== secretToken) {
    return response.status(401).json({ error: 'Unauthorized.' });
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
      },
      error: (...args) => {
        logs.push("[ERROR] " + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      }
    };

    // 1. Create an AsyncFunction constructor so the string can use top-level await syntax
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

    const runner = new AsyncFunction('console', `
      try {
        ${code}
      } catch (err) {
        throw err;
      }
    `);

    # 2. Crucial Fix: We use 'await' here so the server waits for any network/fetch commands to complete!
    const result = await runner(customConsole);

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
}
