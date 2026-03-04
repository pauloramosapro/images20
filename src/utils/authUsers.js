import fs from 'fs';
import path from 'path';

/**
 * Reads and parses the permit.lst file into an array of user objects
 * @returns {Array} Array of user objects with fields: beeldbank, private, ip, veld4a, veld4b
 */
export function getAuthUsers() {
    try {
        const filePath = path.join(process.cwd(), '..', '..', 'cgi-bin', 'misc', 'permit.lst');
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split('\n');
        const entries = [];
        let currentBeeldbank = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines and section dividers
            if (!trimmedLine || trimmedLine.startsWith('----')) continue;
            
            // Check for section header (lines with only letters)
            if (/^[a-zA-Z]+$/.test(trimmedLine)) {
                currentBeeldbank = trimmedLine;
                continue;
            }

            // Split by tab or multiple spaces
            const parts = trimmedLine.split(/\t|\s{2,}/).filter(part => part.trim() !== '');
            
            if (parts.length >= 3) {
                const namePart = parts.slice(3).join(' ');
                const nameParts = namePart.split(' - ');
                
                entries.push({
                    beeldbank: currentBeeldbank,
                    private: parts[1],
                    ip: parts[2],
                    veld4a: nameParts[0].trim(),
                    veld4b: nameParts.length > 1 ? nameParts[1].trim() : ''
                });
            }
        }
        
        return entries;
    } catch (error) {
        console.error('Error reading permit.lst:', error);
        return [];
    }
}

/**
 * Finds a user by name and password
 * @param {string} name - The name to search for (veld4a)
 * @param {string} [password] - Optional password to verify (veld4b)
 * @returns {Object|undefined} The matching user object or undefined if not found
 */
export function findUser(name, password) {
    const users = getAuthUsers();
    return users.find(user => 
        user.veld4a === name && 
        (!password || user.veld4b === password)
    );
}

/**
 * Gets all users for a specific section (beeldbank)
 * @param {string} section - The section name to filter by
 * @returns {Array} Array of users in the specified section
 */
export function getUsersBySection(section) {
    const users = getAuthUsers();
    return users.filter(user => user.beeldbank === section);
}
