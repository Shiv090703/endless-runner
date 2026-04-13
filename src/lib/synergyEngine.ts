export interface SynergyResult {
    title: string;
    description: string;
}

export function calculateSynergy(ai: number, cloud: number, security: number): SynergyResult {
    const total = ai + cloud + security;
    
    // Default/Balanced states
    if (total === 0) {
        return {
            title: "SYNERGY OFFLINE",
            description: "No tech data nodes were collected. System synergy cannot be established."
        };
    }
    
    if (ai === cloud && cloud === security) {
         return {
            title: "OMNI-SYNERGY DETECTED",
            description: "Perfectly balanced data retrieval. Your node integration is flawless across all sectors."
        };
    }

    // Determine highest
    let highest = 'ai';
    let max = ai;

    if (cloud > max) {
        highest = 'cloud';
        max = cloud;
    }
    
    if (security > max) {
        highest = 'security';
        max = security;
    }

    // Check for ties in highest
    if (highest === 'ai' && ai === cloud) {
        return { title: "NEURAL-CLOUD ARCHITECTURE", description: "Extreme affinity for high-availability cloud matrices merged with AI inference engines." };
    }
    if (highest === 'ai' && ai === security) {
        return { title: "SECURE AI PROCESSING", description: "Focused interception of AI models within hardened, fault-tolerant secure layers." };
    }
    if (highest === 'cloud' && cloud === security) {
        return { title: "SECURE CLOUD INFRASTRUCTURE", description: "Specialized in retrieving high-tier cloud architecture tokens while maintaining firewall integrity." };
    }

    // Single dominance
    switch (highest) {
        case 'ai':
            return {
                title: "DOMINANCE: NEURAL AI",
                description: "Your movement patterns heavily favor autonomous AI processing sectors. Neural integration is peaking."
            };
        case 'cloud':
            return {
                title: "DOMINANCE: AZURE CLOUD",
                description: "A high affinity for scalable cloud infrastructure nodes. Your data streaming bandwidth is optimal."
            };
        case 'security':
            return {
                title: "DOMINANCE: SUPABASE SECURITY",
                description: "Strict focus on Database fortification and security shields. Your payload is incredibly secure."
            };
    }
    
    return { title: "UNKNOWN", description: "Synergy calculation failed." };
}
