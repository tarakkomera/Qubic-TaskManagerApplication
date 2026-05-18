const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/tarak/Desktop/react_pro/frontend/src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Replace the messy double nested template literal first
    const regex1 = /\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*`\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*"http:\/\/localhost:4000\/api"\}`\}/g;
    if (regex1.test(content)) {
        content = content.replace(regex1, "${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}");
        changed = true;
    }
    
    // Replace the single VITE_API_URL || "http://localhost:4000/api"
    const regex2 = /\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*"http:\/\/localhost:4000\/api"\}/g;
    if (regex2.test(content)) {
        content = content.replace(regex2, "${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
