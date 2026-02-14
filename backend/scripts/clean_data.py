import os
import re
import json
import pdfplumber

RAW_DIR = "data/raw"
CLEAN_DIR = "data/cleaned"

os.makedirs(CLEAN_DIR,exist_ok=True)

def clean_text(text):
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)
    return text

def extract_from_pdf(pdf_path):
    entries = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text: continue
            
            # Split by lines
            lines = text.split('\n')
            
            # Pattern: "Crop Name" followed by details
            for i, line in enumerate(lines):
                if re.match(r'^[A-Z][A-Za-z ]{2,}$', line.strip()):
                    crop_name = line.strip()
                    
                    # Collect subsequent lines as description
                    desc_lines = []
                    for j in range(i + 1, len(lines)):
                        next_line = lines[j].strip()
                        if not next_line: continue
                        
                        # Stop if we hit another crop name or a clear separator
                        if re.match(r'^[A-Z][A-Za-z ]{2,}$', next_line) or next_line.startswith('---'):
                            break
                        
                        desc_lines.append(next_line)
                    
                    description = clean_text(' '.join(desc_lines))
                    
                    entries.append({
                        "crop_name": crop_name,
                        "description": description
                    })
    return entries

def process_all_pdfs():
    for filename in os.listdir(RAW_DIR):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(RAW_DIR, filename)
            print(f"Processing {filename}...")
            
            entries = extract_from_pdf(pdf_path)
            
            # Save to JSON
            output_path = os.path.join(CLEAN_DIR, filename.replace(".pdf", ".json"))
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(entries, f, ensure_ascii=False, indent=2)
            
            print(f"Saved {len(entries)} entries to {output_path}")

if __name__ == "__main__":
    process_all_pdfs()
