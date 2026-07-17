from PIL import Image

im = Image.open("public/logo.png")
im = im.convert("RGBA")
width, height = im.size

# Let's inspect the corner pixel
print("Top-left pixel color:", im.getpixel((0, 0)))
print("Top-right pixel color:", im.getpixel((width - 1, 0)))
print("Bottom-left pixel color:", im.getpixel((0, height - 1)))
print("Middle pixel color:", im.getpixel((width // 2, height // 2)))
