from PIL import Image

im = Image.open("public/logo.png")
im = im.convert("RGBA")
datas = im.getdata()

newData = []
for item in datas:
    r, g, b, a = item
    # Background is dark grey/brown (around 34, 31, 31).
    # If R, G, B are all close to each other and less than 42, it's background.
    # Let's check:
    is_bg = False
    if r < 42 and g < 42 and b < 42:
        # Check if they are close to each other (i.e. greyish/black)
        if abs(r - g) < 10 and abs(g - b) < 10 and abs(r - b) < 10:
            is_bg = True
            
    if is_bg:
        newData.append((0, 0, 0, 0))
    else:
        newData.append(item)

im.putdata(newData)
im.save("public/logo.png", "PNG")
im.save("public/favicon.png", "PNG")
print("Successfully converted background to transparent!")
