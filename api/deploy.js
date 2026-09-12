export default async function handler(req, res) {
    // Only allow POST requests for security
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. SECURE TOKEN LOCATION: This pulls your hidden token directly from Vercel's secure vault
    const GITHUB_TOKEN = process.env.MY_GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.MY_GITHUB_USERNAME;

    const { repoName, files } = req.body;

    try {
        // 2. Create the GitHub Repository
        const repoRes = await fetch(`https://github.com`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: repoName, auto_init: false })
        });

        if (!repoRes.ok) throw new Error("Website name already exists or is invalid!");

        // 3. Upload the files
        for (const file of files) {
            await fetch(`https://github.com{GITHUB_USERNAME}/${repoName}/contents/${file.name}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Add ${file.name}`,
                    content: file.content // Base64 string sent from frontend
                })
            });
        }

        // 4. Turn on GitHub Pages hosting
        await fetch(`https://github.com{GITHUB_USERNAME}/${repoName}/pages`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source: { branch: 'main', path: '/' } })
        });

        // 5. Return success to the user
        const liveUrl = `https://${GITHUB_USERNAME}.github.io/${repoName}/`;
        return res.status(200).json({ url: liveUrl });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
