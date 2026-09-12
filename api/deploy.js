export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GITHUB_TOKEN = process.env.MY_GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.MY_GITHUB_USERNAME;

    // Safety check to ensure keys are actually being read by Vercel
    if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
        return res.status(500).json({ error: "Configuration Error: Serverless function cannot find your Environment Variables in Vercel Settings!" });
    }

    const { repoName, files } = req.body;

    try {
        const repoRes = await fetch(`https://github.com`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: repoName, auto_init: false })
        });

        // REVEAL REAL ERROR: This extracts GitHub's exact raw response description
        if (!repoRes.ok) {
            const errorData = await repoRes.json();
            throw new Error(`GitHub API Error: ${errorData.message || repoRes.statusText}`);
        }

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
                    content: file.content
                })
            });
        }

        await fetch(`https://github.com{GITHUB_USERNAME}/${repoName}/pages`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source: { branch: 'main', path: '/' } })
        });

        const liveUrl = `https://${GITHUB_USERNAME}.github.io/${repoName}/`;
        return res.status(200).json({ url: liveUrl });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
