export interface IntelArticle {
    title: string;
    description: string;
    url: string;
    timestamp: string;
}

export async function fetchLiveNews(synergyTitle: string): Promise<IntelArticle[]> {
    const apiKey = import.meta.env.VITE_GNEWS_API_KEY;
    
    // Simulated fallback data if API limit (HTTP 429) is reached
    const fallbackNews: IntelArticle[] = [
        {
             title: "Quantum Neural Links Stabilized", 
             description: "Global infrastructure reports a 400% increase in neural network efficiency matching your detected Synergy pattern.", 
             url: "#", 
             timestamp: new Date().toISOString()
        },
        {
             title: "Supabase Clusters Scaling", 
             description: "Data encapsulation protocols triggered. Your recent node collection event successfully wrote to the remote database.", 
             url: "#", 
             timestamp: new Date().toISOString()
        },
        {
             title: "API Rate Limits Exhausted", 
             description: "GNews external uplink severed (HTTP 429). Transitioning to simulated internal network data feed.", 
             url: "#", 
             timestamp: new Date().toISOString()
        }
    ];

    if (!apiKey) {
        console.warn("GNews API Key missing. Falling back to simulated network.");
        return fallbackNews;
    }

    // Map synergy focus to optimal API search query
    let query = 'Technology';
    const lowerSynergy = synergyTitle.toLowerCase();
    
    if (lowerSynergy.includes('ai') || lowerSynergy.includes('neural')) {
        query = 'Artificial Intelligence OR ChatGPT OR LLM';
    } else if (lowerSynergy.includes('cloud')) {
        query = 'Cloud Computing OR Azure OR AWS OR GCP';
    } else if (lowerSynergy.includes('security')) {
        query = 'Cybersecurity OR Infosec OR "Zero Day"';
    }

    try {
        const response = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=3&apikey=${apiKey}`);
        
        if (!response.ok) {
           throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.articles && data.articles.length > 0) {
            return data.articles.map((article: any) => ({
                title: article.title,
                description: article.description,
                url: article.url,
                timestamp: article.publishedAt
            }));
        }

        return fallbackNews;
    } catch (e) {
        console.error("News Engine Error:", e);
        return fallbackNews;
    }
}
