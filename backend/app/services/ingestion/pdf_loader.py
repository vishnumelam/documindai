import fitz


def load_pdf(file_path):
    document = fitz.open(file_path)

    pages = []

    for page_number, page in enumerate(document, start=1):
        text = page.get_text()

        if text:
            pages.append({
                "page": page_number,
                "text": text
            })

    document.close()

    return pages