const fs = require('fs');
const path = require('path');

// Configuration
const IMAGES_FOLDER = './images';
const OUTPUT_FILE = './data.js';
const CONFIG_FILE = './data-config.json';

// Load config if exists
let config = {
    categoryNames: {},
    stimulusNames: {},
    ignore: []
};

if (fs.existsSync(CONFIG_FILE)) {
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        console.log('📋 Loaded configuration from', CONFIG_FILE);
    } catch (error) {
        console.warn('⚠️  Could not load config file, using defaults');
    }
}

function formatName(name) {
    return name
        .split(/[_\s-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function extractStimulusName(filename) {
    // Remove extension
    let name = filename.replace(/\.[^.]+$/, '');
    
    // Remove trailing numbers (red1, red_2, red-3, etc.)
    name = name.replace(/[_-]?\d+$/, '');
    
    // Remove trailing separators
    name = name.replace(/[_-]$/g, '');
    
    return name.trim();
}

function generateQuizData() {
    const programs = [];
    
    try {
        // Read all category folders
        const categories = fs.readdirSync(IMAGES_FOLDER, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => !config.ignore.includes(dirent.name))
            .map(dirent => dirent.name)
            .sort();
        
        console.log(`\n🔍 Found ${categories.length} categories:\n`);
        
        // Process each category
        categories.forEach(categoryName => {
            const categoryPath = path.join(IMAGES_FOLDER, categoryName);
            const stimulusMap = new Map();
            
            // Read all image files
            const files = fs.readdirSync(categoryPath)
                .filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext);
                })
                .sort();
            
            console.log(`📁 ${categoryName}/`);
            console.log(`   Found ${files.length} images`);
            
            // Group images by stimulus name
            files.forEach(file => {
                const baseName = extractStimulusName(file);
                let stimulusName = config.stimulusNames[baseName] || formatName(baseName);
                
                const imagePath = `images/${categoryName}/${file}`;
                
                if (!stimulusMap.has(stimulusName)) {
                    stimulusMap.set(stimulusName, []);
                }
                stimulusMap.get(stimulusName).push(imagePath);
            });
            
            // Create stimulus array for this category
            const stimulus = Array.from(stimulusMap.entries())
                .map(([name, images]) => ({
                    name: name,
                    images: images.sort() // Sort images by filename
                }))
                .sort((a, b) => a.name.localeCompare(b.name)); // Sort stimuli alphabetically
            
            // Format category name
            const formattedCategoryName = config.categoryNames[categoryName] || formatName(categoryName);
            
            programs.push({
                name: formattedCategoryName,
                stimulus: stimulus
            });
            
            console.log(`   ✅ Created ${stimulus.length} stimuli:`);
            stimulus.forEach(s => {
                console.log(`      • ${s.name} (${s.images.length} image${s.images.length > 1 ? 's' : ''})`);
            });
            console.log('');
        });
        
        // Generate statistics
        const totalStimuli = programs.reduce((sum, p) => sum + p.stimulus.length, 0);
        const totalImages = programs.reduce((sum, p) => 
            sum + p.stimulus.reduce((s, st) => s + st.images.length, 0), 0);
        
        // Generate the JavaScript file
        const dataContent = `// Auto-generated quiz data
// Generated on: ${new Date().toLocaleString()}
// Total Programs: ${programs.length}
// Total Stimuli: ${totalStimuli}
// Total Images: ${totalImages}

const quizData = ${JSON.stringify({ programs }, null, 2)};

// Make available for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = quizData;
}
`;
        
        fs.writeFileSync(OUTPUT_FILE, dataContent, 'utf8');
        
        console.log('═══════════════════════════════════════════');
        console.log('✅ Successfully generated', OUTPUT_FILE);
        console.log('═══════════════════════════════════════════');
        console.log(`📊 Statistics:`);
        console.log(`   Programs: ${programs.length}`);
        console.log(`   Stimuli:  ${totalStimuli}`);
        console.log(`   Images:   ${totalImages}`);
        console.log('═══════════════════════════════════════════\n');
        
        return programs;
        
    } catch (error) {
        console.error('❌ Error generating data:', error);
        process.exit(1);
    }
}

// Run the generator
console.log('═══════════════════════════════════════════');
console.log('🚀 Quiz Data Generator');
console.log('═══════════════════════════════════════════');
console.log('📂 Scanning:', IMAGES_FOLDER);
console.log('📝 Output:  ', OUTPUT_FILE);
generateQuizData();