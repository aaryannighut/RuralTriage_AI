import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, 'src', 'app', 'pages');
const componentsDir = path.join(__dirname, 'src', 'app', 'components');

function flattenFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace rounded-2xl with rounded-md
    content = content.replace(/rounded-2xl/g, 'rounded-md');
    // Replace rounded-[12px] or rounded-[10px] with rounded-md
    content = content.replace(/rounded-\[12px\]/g, 'rounded-md');
    content = content.replace(/rounded-\[10px\]/g, 'rounded-md');
    content = content.replace(/rounded-[Xxl]+/g, 'rounded-md');
    // Replace shadow-2xl / shadow-lg with shadow-sm
    content = content.replace(/shadow-2xl/g, 'shadow-sm');
    content = content.replace(/shadow-lg/g, 'shadow-sm');
    // For specific large rounded-full borders on main buttons
    content = content.replace(/rounded-full hover:/g, 'rounded-md hover:');
    content = content.replace(/rounded-full flex/g, 'rounded-md flex');
    content = content.replace(/rounded-full px/g, 'rounded-md px');
    content = content.replace(/rounded-full w-/g, 'rounded-md w-');
    content = content.replace(/rounded-full bg-/g, 'rounded-md bg-');

    fs.writeFileSync(filePath, content, 'utf8');
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            flattenFile(fullPath);
        }
    }
}

walkDir(pagesDir);
walkDir(componentsDir);
console.log('UI Flattened to Government-Style successfully!');
