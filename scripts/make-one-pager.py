"""Package the verified one-slide preview as a one-page submission PDF."""

from pathlib import Path

from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
PNG = ROOT / "public" / "collections-review-one-pager.png"
PDF = ROOT / "public" / "collections-review-one-pager.pdf"
WIDTH, HEIGHT = 960, 540

document = canvas.Canvas(str(PDF), pagesize=(WIDTH, HEIGHT), pageCompression=1)
document.setTitle("Collections Review Desk | One-page solution")
document.setAuthor("Collections Review Desk team")
document.drawImage(str(PNG), 0, 0, width=WIDTH, height=HEIGHT)
document.showPage()
document.save()
print(PDF)
