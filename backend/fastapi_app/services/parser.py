import os
import csv
import logging
from PIL import Image
import pytesseract
import pdfplumber
from PyPDF2 import PdfReader
import docx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_pdf(file_path: str) -> str:
    text = ""
    # Try pdfplumber first (better layout extraction)
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.warning(f"pdfplumber failed for {file_path}, falling back to PyPDF2. Error: {e}")
        # Fallback to PyPDF2
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as py_e:
            logger.error(f"PyPDF2 also failed for {file_path}. Error: {py_e}")
            raise Exception("Failed to extract text from PDF document.")
    return text

def parse_docx(file_path: str) -> str:
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return '\n'.join(full_text)
    except Exception as e:
        logger.error(f"docx parsing failed. Error: {e}")
        raise Exception("Failed to extract text from DOCX document.")

def parse_txt(file_path: str) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        logger.error(f"txt parsing failed. Error: {e}")
        raise Exception("Failed to read text file.")

def parse_csv(file_path: str) -> str:
    try:
        text_lines = []
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            if headers:
                text_lines.append(f"Columns: {', '.join(headers)}")
            for idx, row in enumerate(reader):
                row_str = f"Row {idx + 1}: " + ", ".join([f"{headers[i] if headers and i < len(headers) else f'Col{i}'}: {val}" for i, val in enumerate(row)])
                text_lines.append(row_str)
        return "\n".join(text_lines)
    except Exception as e:
        logger.error(f"CSV parsing failed. Error: {e}")
        raise Exception("Failed to parse CSV file.")

def parse_image_ocr(file_path: str) -> str:
    try:
        image = Image.open(file_path)
        # Verify if tesseract is installed. If not, raise specific instruction error
        text = pytesseract.image_to_string(image)
        return text
    except pytesseract.TesseractNotFoundError:
        logger.error("Tesseract-OCR was not found on the host system.")
        return "[OCR Error: Tesseract-OCR is not installed or not in system PATH. Image text could not be extracted.]"
    except Exception as e:
        logger.error(f"OCR failed. Error: {e}")
        raise Exception(f"Failed to perform OCR on image: {str(e)}")

def extract_text(file_path: str, file_type: str) -> str:
    """
    Dispatches file parsing to the correct handler based on file type.
    """
    ft = file_type.lower().strip('.')
    if ft == 'pdf':
        return parse_pdf(file_path)
    elif ft == 'docx':
        return parse_docx(file_path)
    elif ft in ['txt', 'md']:
        return parse_txt(file_path)
    elif ft == 'csv':
        return parse_csv(file_path)
    elif ft in ['png', 'jpg', 'jpeg']:
        return parse_image_ocr(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
