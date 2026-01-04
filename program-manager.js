
 
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 800;
const IMAGE_QUALITY = 0.7;

let programsCache = null;

// Initialize programs from built-in data on first load
async function initializePrograms() {
    // If already loaded this session, return cached version
    if (programsCache !== null) {
        return programsCache;
    }
    
    // Priority 1: Load from file
    const filePrograms = await FileStorage.loadFromSameDirectory();
    if (filePrograms && filePrograms.length > 0) {
        console.log('✓ Loaded from quiz-programs.json');
        programsCache = filePrograms;
        return programsCache;
    }
    
    // Priority 2: Use built-in data as fallback
    const builtInPrograms = window.quizData?.programs || [];
    programsCache = builtInPrograms.map(prog => ({
        ...prog,
        builtin: true,
        editable: true
    }));

    console.log('Using built-in programs (no file found)');
    return programsCache;
}


// Get all programs from localStorage
function getAllPrograms() {
    return initializePrograms();
}

// Save all programs to localStorage
async function saveAllPrograms(programs) {
    programsCache = programs;
    
    // Ask if they want to export now or later
    const exportNow = confirm(
        '✓ Changes saved!\n\n' +
        'Do you want to export to file now?\n\n' +
        'YES = Download quiz-programs.json now\n' +
        'NO = Export later (changes stay until page refresh)\n\n' +
        'To persist changes: save the downloaded file to your shared folder.'
    );
    
    if (exportNow) {
        const success = await FileStorage.exportToFile(programs);
        if (success) {
            alert(
                '✓ Exported to quiz-programs.json\n\n' +
                '⚠️ Save in LEARNING APP folder. Replace existing file if needed.\n\n'
            );
        }
        return success;
    }
    
    return true; // Changes saved in memory
}

// Legacy function for backwards compatibility
function getCustomPrograms() {
    // Return programs marked as custom (user-created after initial load)
    return getAllPrograms().filter(p => p.custom === true);
}

// Image compression helper
function compressImage(file, maxWidth = MAX_IMAGE_WIDTH, maxHeight = MAX_IMAGE_HEIGHT, quality = IMAGE_QUALITY) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG with compression
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Log compression stats
                const originalSize = (e.target.result.length / 1024).toFixed(2);
                const compressedSize = (compressedDataUrl.length / 1024).toFixed(2);
                console.log(`Compressed image: ${originalSize}KB → ${compressedSize}KB (${((1 - compressedDataUrl.length / e.target.result.length) * 100).toFixed(1)}% reduction)`);
                
                resolve(compressedDataUrl);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Modal Manager
class ProgramModalManager {
    constructor() {
        this.modal = document.getElementById('programModal');
        this.closeBtn = document.getElementById('closeModal');
        this.openBtn = document.getElementById('openProgramModal');
        
        // Tabs
        this.tabAdd = document.getElementById('tabAdd');
        this.tabEdit = document.getElementById('tabEdit');
        this.addSection = document.getElementById('addProgramSection');
        this.editSection = document.getElementById('editProgramSection');
        
        // Add program form
        this.programForm = document.getElementById('programForm');
        this.addStimulusBtn = document.getElementById('addStimulusBtn');
        this.stimuliContainer = document.getElementById('stimuliContainer');
        this.addStimulusField();
        
        // Edit program dropdown
        this.programDropdown = document.getElementById('programSelectDropdown');
        this.editContainer = document.getElementById('editStimuliContainer');
        this.addEditStimulusBtn = document.getElementById('addEditStimulusBtn');
        this.saveEditsBtn = document.getElementById('saveEditsBtn');
        
        // State
        this.currentEditProgramIndex = null;
        this.stimulusCounter = 0;
        
        this.init();
    }
    
    init() {
        // Modal controls
        this.openBtn?.addEventListener('click', () => this.openModal());
        this.closeBtn?.addEventListener('click', () => this.closeModal());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        // Tab switching
        this.tabAdd?.addEventListener('click', () => this.switchTab('add'));
        this.tabEdit?.addEventListener('click', () => this.switchTab('edit'));
        
        
        // Add program functionality
        this.addStimulusBtn?.addEventListener('click', () => this.addStimulusField());
        this.programForm?.addEventListener('submit', (e) => this.saveNewProgram(e));
        
        // Edit program functionality
        this.programDropdown?.addEventListener('change', (e) => this.loadProgramForEdit(e.target.value));
        this.addEditStimulusBtn?.addEventListener('click', () => this.addEditStimulusField());
        this.saveEditsBtn?.addEventListener('click', () => this.saveEdits());
    
        // Add import button functionality
        const importBtn = document.getElementById('importProgramsBtn');
        importBtn?.addEventListener('click', async () => {
            try {
                const programs = await importPrograms();
                if (programs) {
                    alert('✓ Programs loaded successfully!\n\nRefresh the page to see changes.');
                    window.location.reload();
                }
            } catch (error) {
                alert('Failed to import: ' + error.message);
            }
        });
    }
    
    openModal() {
        this.modal?.classList.remove('hidden');
        this.modal?.classList.add('show');
        this.switchTab('add');
    }
    
    closeModal() {
        this.modal?.classList.add('hidden');
        this.modal?.classList.remove('show');
        this.resetForms();
    }
    
    async switchTab(tab) {
        if (tab === 'add') {
            this.addSection?.classList.add('show');
            this.addSection?.classList.remove('hidden');
            this.editSection?.classList.add('hidden');
            this.editSection?.classList.remove('show');
            this.tabAdd?.classList.add('active');
            this.tabEdit?.classList.remove('active');
        } else {
            this.editSection?.classList.add('show');
            this.editSection?.classList.remove('hidden');
            this.addSection?.classList.add('hidden');
            this.addSection?.classList.remove('show');
            this.tabEdit?.classList.add('active');
            this.tabAdd?.classList.remove('active');
            await this.populateEditDropdown();
        }
    }
    
    // ===== ADD PROGRAM FUNCTIONALITY =====
    
    addStimulusField() {
        const stimulusId = `stimulus-${this.stimulusCounter++}`;
        const div = document.createElement('div');
        div.className = 'stimulus-field';
        div.dataset.stimulusId = stimulusId;
        
        div.innerHTML = `
            <input type="text" placeholder="Stimulus name (e.g. Chicken)" class="stimulusName" required />
            <input type="file" accept="image/*" multiple class="stimulusImages" data-id="${stimulusId}" />
            <div class="image-preview-container" id="preview-${stimulusId}"></div>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()">Remove</button>
        `;
        
        // Add file change listener for preview
        const fileInput = div.querySelector('.stimulusImages');
        fileInput.addEventListener('change', (e) => this.previewImages(e, stimulusId));
        
        this.stimuliContainer?.appendChild(div);
    }
    
previewImages(event, stimulusId) {
    const input = event.target;
    const originalFiles = Array.from(input.files);

    if (originalFiles.length > 4) {
        alert("You can upload a maximum of 4 images.");

        // Keep only the first 4
        const dt = new DataTransfer();
        originalFiles.slice(0, 4).forEach(file => dt.items.add(file));
        input.files = dt.files;
    }

    // Now read the *actual* files from the input
    const files = Array.from(input.files);

    const previewContainer = document.getElementById(`preview-${stimulusId}`);
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            img.style.margin = '4px';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

    
    async saveNewProgram(e) {
        e.preventDefault();
        
        const programNameInput = this.programForm.querySelector('input[type="text"]');
        const programName = programNameInput?.value.trim();
        
        if (!programName) {
            alert('Please enter a program name');
            return;
        }
        // possibly redudant check below:
        // Collect all stimuli - including the initial one
        const stimulusFields = this.stimuliContainer?.querySelectorAll('.stimulus-field');
               
        const stimuli = [];
        
        // Show progress
        const saveBtn = this.programForm.querySelector('button[type="submit"]');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Compressing images...';
        
        try {
            
            // Then process additional stimuli from .stimulus-field divs
            if (stimulusFields) {
                for (const field of stimulusFields) {
                    const nameInput = field.querySelector('.stimulusName');
                    const fileInput = field.querySelector('.stimulusImages');
                    const name = nameInput?.value.trim();
                    
                    if (!name) continue;
                    
                    const images = [];
                    if (fileInput?.files) {
                        const files = Array.from(fileInput.files).slice(0, 4);
                        
                        for (const file of files) {
                            // Compress image before storing
                            const compressed = await compressImage(file);
                            images.push(compressed);
                        }
                    }
                    
                    if (images.length > 0) {
                        stimuli.push({ name, images });
                    }
                }
            }
            
            if (stimuli.length === 0) {
                alert('Please add at least one stimulus with images');
                return;
            }
            
            saveBtn.textContent = 'Saving...';
            
            // Create new program
            const newProgram = {
                name: programName,
                stimulus: stimuli,
                custom: true,
                editable: true
            };
            
            // Add to all programs
            const allPrograms = await getAllPrograms();
            allPrograms.push(newProgram);
            
            if (await saveAllPrograms(allPrograms)) {
                // Refresh program list immediately (uses cached data)
                if (typeof loadPrograms === 'function') {
                    await loadPrograms();
                }
                
                this.resetForms();
                this.closeModal();
            }
        } catch (error) {
            console.error('Error saving program:', error);
            alert('Error saving program. Please try again with fewer or smaller images.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }
    
    // ===== EDIT PROGRAM FUNCTIONALITY =====
    
    async populateEditDropdown() {
        if (!this.programDropdown) return;
        
        this.programDropdown.innerHTML = '<option value="">-- Select Program --</option>';
        
        const allPrograms = await getAllPrograms();
        
        allPrograms.forEach((program, index) => {
            const option = document.createElement('option');
            option.value = index;
            // Show badge for originally built-in programs
            const badge = program.builtin ? ' 🏠' : (program.custom ? ' ⭐' : '');
            option.textContent = `${program.name}${badge}`;
            this.programDropdown.appendChild(option);
        });
        
        if (allPrograms.length === 0) {
            this.editContainer.innerHTML = '<p style="text-align:center; color:#666;">No programs available.</p>';
        } else {
            this.editContainer.innerHTML = '<p style="text-align:center; color:#666;">Select a program above to edit.</p>';
        }
    }
    
    async loadProgramForEdit(value) {
        if (!value || value === '') {
            this.editContainer.innerHTML = '<p style="text-align:center; color:#666;">Select a program above to edit.</p>';
            this.currentEditProgramIndex = null;
            return;
        }
        
        const index = parseInt(value);
        const allPrograms = await getAllPrograms();
        const program = allPrograms[index];
        
        if (!program) {
            this.editContainer.innerHTML = '<p style="color:red;">Program not found.</p>';
            return;
        }
        
        this.currentEditProgramIndex = index;
        this.renderEditStimuli(program);
    }
    
    renderEditStimuli(program) {
        const infoMessage = program.builtin ? `
            <div></div>

        ` : '';
        
        const deleteButton = `
            <button type="button" id="delete-program-btn" class="btn-danger" 
                    style="background:#e53e3e; color:white; padding:8px 16px; border:none; border-radius:6px; cursor:pointer; margin-top:10px;">
                🗑️ Delete Program
            </button>
        `;
        
        this.editContainer.innerHTML = `
            ${infoMessage}
            <div style="margin-bottom: 15px;">
                <label style="font-weight:600; color:#333;">Program Name:</label>
                <input type="text" id="edit-program-name" value="${program.name}" 
                       style="width:100%; padding:8px; border:2px solid #e2e8f0; border-radius:6px; margin-top:5px;" />
            </div>
            <h3 style="margin-top:20px; margin-bottom:10px; color:#333;">Stimuli:</h3>
            <div id="edit-stimuli-list"></div>
            ${deleteButton}
        `;
        
        // Add delete button listener
        const deleteBtn = document.getElementById('delete-program-btn');
        deleteBtn?.addEventListener('click', () => this.deleteProgram());
        
        const stimuliList = document.getElementById('edit-stimuli-list');
        
        program.stimulus.forEach((stim, index) => {
            const stimDiv = document.createElement('div');
            stimDiv.className = 'edit-stimulus-item';
            stimDiv.dataset.index = index;
            stimDiv.style.cssText = 'background:#f7fafc; padding:12px; margin-bottom:10px; border-radius:8px; border:1px solid #e2e8f0;';
            
            const imagesHTML = stim.images.map((img, i) => 
                `<div style="display:inline-block; position:relative; margin:4px;">
                    <img src="${img}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;" />
                    <button type="button" class="img-remove-btn" data-stim-index="${index}" data-img-index="${i}"
                            style="position:absolute; top:-5px; right:-5px; background:#e53e3e; color:white; border:none; 
                                   border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; line-height:1;">×</button>
                </div>`
            ).join('');
            
            stimDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <input type="text" class="edit-stim-name" value="${stim.name}" 
                           style="flex:1; padding:6px; border:2px solid #e2e8f0; border-radius:6px; margin-right:10px;" />
                    <button type="button" class="btn-remove" onclick="programModal.removeEditStimulus(${index})">Remove Stimulus</button>
                </div>
                <div style="margin-bottom:8px;" class="images-container">${imagesHTML}</div>
                <input type="file" accept="image/*" multiple class="edit-stim-images" data-index="${index}" 
                       style="font-size:0.85rem;" />
                <p style="font-size:0.8rem; color:#666; margin-top:4px;">Add images to append, or remove existing images above</p>
            `;
            
            stimuliList.appendChild(stimDiv);
        });
        
        // Add event listeners for image remove buttons
        document.querySelectorAll('.img-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stimIndex = parseInt(e.target.dataset.stimIndex);
                const imgIndex = parseInt(e.target.dataset.imgIndex);
                this.removeImageFromStimulus(stimIndex, imgIndex);
            });
        });
    }
    
    removeImageFromStimulus(stimIndex, imgIndex) {
        const stimItem = document.querySelector(`.edit-stimulus-item[data-index="${stimIndex}"]`);
        if (!stimItem) return;
        
        // Get current images
        const imagesContainer = stimItem.querySelector('.images-container');
        const images = Array.from(imagesContainer.querySelectorAll('img'));
        
        if (images.length <= 1) {
            alert('Each stimulus must have at least one image. Add new images before removing the last one.');
            return;
        }
        
        if (confirm('Remove this image?')) {
            // Remove the image div
            const imgDivs = imagesContainer.querySelectorAll('div');
            if (imgDivs[imgIndex]) {
                imgDivs[imgIndex].remove();
            }
        }
    }
    
    addEditStimulusField() {
        if (this.currentEditProgramIndex === null) {
            alert('Please select a program first');
            return;
        }
        
        const stimuliList = document.getElementById('edit-stimuli-list');
        if (!stimuliList) return;
        
        const newIndex = stimuliList.children.length;
        const stimDiv = document.createElement('div');
        stimDiv.className = 'edit-stimulus-item';
        stimDiv.dataset.index = newIndex;
        stimDiv.dataset.isNew = 'true';
        stimDiv.style.cssText = 'background:#f7fafc; padding:12px; margin-bottom:10px; border-radius:8px; border:1px solid #e2e8f0;';
        
        stimDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <input type="text" class="edit-stim-name" placeholder="Stimulus name" 
                       style="flex:1; padding:6px; border:2px solid #e2e8f0; border-radius:6px; margin-right:10px;" />
                <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()">Remove</button>
            </div>
            <input type="file" accept="image/*" multiple class="edit-stim-images" data-index="${newIndex}" 
                   style="font-size:0.85rem;" required />
        `;
        
        stimuliList.appendChild(stimDiv);
    }
    
    removeEditStimulus(index) {
        const stimItem = document.querySelector(`.edit-stimulus-item[data-index="${index}"]`);
        if (stimItem && confirm('Please confirm you want to remove this stimulus?')) {
            stimItem.remove();
        }
    }
    
    async saveEdits() {
        if (this.currentEditProgramIndex === null) {
            alert('No program selected');
            return;
        }
        
        const programNameInput = document.getElementById('edit-program-name');
        const programName = programNameInput?.value.trim();
        
        if (!programName) {
            alert('Please enter a program name');
            return;
        }
        
        const stimuliItems = document.querySelectorAll('.edit-stimulus-item');
        const stimuli = [];
        
        // Show progress
        this.saveEditsBtn.disabled = true;
        const originalText = this.saveEditsBtn.textContent;
        this.saveEditsBtn.textContent = 'Processing...';
        
        try {
            for (const item of stimuliItems) {
                const nameInput = item.querySelector('.edit-stim-name');
                const fileInput = item.querySelector('.edit-stim-images');
                const name = nameInput?.value.trim();
                
                if (!name) continue;
                
                let images = [];
                
                // If new stimulus, must have files
                if (item.dataset.isNew === 'true') {
                    if (!fileInput?.files || fileInput.files.length === 0) {
                        alert(`Please add images for "${name}"`);
                        return;
                    }
                    
                    this.saveEditsBtn.textContent = 'Compressing new images...';
                    const files = Array.from(fileInput.files).slice(0, 4);
                    for (const file of files) {
                        const compressed = await compressImage(file);
                        images.push(compressed);
                    }
                } else {
                    // Existing stimulus - get remaining images from DOM
                    const imagesContainer = item.querySelector('.images-container');
                    const existingImages = Array.from(imagesContainer.querySelectorAll('img')).map(img => img.src);
                    
                    images = [...existingImages];
                    
                    // If new files provided, compress and add them
                    if (fileInput?.files && fileInput.files.length > 0) {
                        this.saveEditsBtn.textContent = 'Compressing additional images...';
                        const files = Array.from(fileInput.files).slice(0, 4 - images.length);
                        for (const file of files) {
                            const compressed = await compressImage(file);
                            images.push(compressed);
                        }
                    }
                }
                
                if (images.length === 0) {
                    alert(`Stimulus "${name}" must have at least one image`);
                    return;
                }
                
                if (images.length > 0) {
                    stimuli.push({ name, images });
                }
            }
            
            if (stimuli.length === 0) {
                alert('Please add at least one stimulus');
                return;
            }
            
            this.saveEditsBtn.textContent = 'Saving...';
            
            // Get all programs
            const allPrograms = await getAllPrograms();
            const originalProgram = allPrograms[this.currentEditProgramIndex];
            
            // Update the program in place
            allPrograms[this.currentEditProgramIndex] = {
                ...originalProgram,
                name: programName,
                stimulus: stimuli,
                builtin: originalProgram?.builtin || false,
                custom: originalProgram?.custom || false,
                editable: true
            };
            
            if (await saveAllPrograms(allPrograms)) {
            // Refresh program list immediately
            if (typeof loadPrograms === 'function') {
                loadPrograms();
            }
            
            // Refresh edit view
            await this.populateEditDropdown();
            this.programDropdown.value = this.currentEditProgramIndex;
            await this.loadProgramForEdit(this.programDropdown.value);
        }
            
        } catch (error) {
            console.error('Error updating program:', error);
            alert('Error updating program. Please try again with fewer or smaller images.');
        } finally {
            this.saveEditsBtn.disabled = false;
            this.saveEditsBtn.textContent = originalText;
        }
    }
    
    async deleteProgram() {
        if (this.currentEditProgramIndex === null) {
            alert('No program selected');
            return;
        }
        
        const allPrograms = await getAllPrograms();
        const program = allPrograms[this.currentEditProgramIndex];
        
        if (!program) return;
        
        if (allPrograms.length <= 1) {
            alert('Cannot delete the last program! Create another program first.');
            return;
        }
        
        if (confirm(`Are you sure you want to delete "${program.name}"?\n\nThis cannot be undone.`)) {
            allPrograms.splice(this.currentEditProgramIndex, 1);
            
            if (await saveAllPrograms(allPrograms)) {
                alert('Program deleted successfully!');
                
                // Refresh program list in main menu
                if (typeof loadPrograms === 'function') {
                    loadPrograms();
                }
                
                // Reset edit view
                this.currentEditProgramIndex = null;
                this.populateEditDropdown();
            }
        }
    }
    
    // ===== UTILITY =====
    
    resetForms() {
        // Reset add form
        this.programForm?.reset();
        if (this.stimuliContainer) {
            this.stimuliContainer.innerHTML = `
                <label>Targets</label>
                <input type="text" placeholder=" Target Name (e.g. Chicken)" class="stimulusName" required />
                <input type="file" class="stimulusImages" accept="image/*" multiple/>
            `;
        }
        
        // Reset edit form
        this.currentEditProgramIndex = null;
        if (this.programDropdown) this.programDropdown.value = '';
        this.editContainer.innerHTML = '<p style="text-align:center; color:#666;">Select a program above to edit.</p>';
        
        this.stimulusCounter = 0;
    }
}

// Initialize when DOM is ready
let programModal;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        programModal = new ProgramModalManager();
    });
} else {
    programModal = new ProgramModalManager();
}

// Export functions for use in menu.js
window.getAllPrograms = getAllPrograms;
window.getCustomPrograms = getCustomPrograms;
window.programModal = programModal;
