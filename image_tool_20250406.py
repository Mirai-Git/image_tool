from PIL import Image, ImageTk, ImageFilter
import numpy as np
from matplotlib import pylab as plt
import tkinter as tk
from tkinter import filedialog, ttk




# グレイスケール化
def grayscale(img):
    return img.convert("L")


# 画像を配列にする
def toArray(img):
    return np.array(img, dtype=np.uint8)


#'>'で閾値より白に近い色は黄色に、それ以外は紫になる
def binary(img_array, threshold, invert=False):
    result = (img_array > threshold) * 255
    if invert:
        result = 255 - result
    return np.uint8(result)






# 画像の輪郭を取る
def countour(img):
    return img.filter(ImageFilter.CONTOUR)


def open_image():
    global material, tk_img
    file_path = filedialog.askopenfilename(
        title="画像を選んでね", filetypes=[("画像ファイル", "*.jpg *.jpeg *png. *.bmp")]
    )
    if not file_path:
        return

    material = Image.open(file_path)
    resized = material.copy()
    resized.thumbnail((250, 250))
    tk_img = ImageTk.PhotoImage(resized)
    image_label.config(image=tk_img)
    image_label.image = tk_img

def execute():
    if material is None:
        return
    
    try:
        threshold=int(threshold_entry.get())
    except ValueError:
        result_label.config(text="閾値は数字で入力してね")
        return
    
    invert = invert_var.get() == "反転する"

    grayscaled = grayscale(material)
    img_array = toArray(grayscaled)
    img_arrayB = binary(img_array, threshold,invert)
    # Image.fromarray()に配列を渡すと配列が画像になる
    # np.uint8でbinary(toArray(material))を８ビットの白黒画像にする。
    y = Image.fromarray(np.uint8(img_arrayB))
    # バイナリ画像と輪郭画像を重ねる
    countoured = countour(material)
    mask = countoured.convert("L")
    im = Image.composite(y, countoured, mask)
    im.show()
    im.save(r"c:\Users\user\OneDrive\デスクトップ\python\image.png")
    result_label.config(text="処理完了！")

root=tk.Tk()
root.title("画像バイナリ処理ツール")
root.geometry("600x400")

frame_left=tk.Frame(root)
frame_left.pack(side="left",padx=10,pady=10)

image_label=tk.Label(frame_left, text="画像がここに表示されるよ")
image_label.pack()

select_button = tk.Button(frame_left, text="画像を選ぶ", command=open_image)
select_button.pack(pady=5)

# 右側：設定項目
frame_right = tk.Frame(root)
frame_right.pack(side="right", fill="both", expand=True, padx=10, pady=10)

# 閾値入力
tk.Label(frame_right, text="閾値:").pack(anchor="w")
threshold_entry = tk.Entry(frame_right)
threshold_entry.insert(0, "128")
threshold_entry.pack(fill="x")

# 反転オプション
tk.Label(frame_right, text="バイナリ反転:").pack(anchor="w")
invert_var = tk.StringVar(value="反転しない")
invert_menu = ttk.Combobox(frame_right, textvariable=invert_var, state="readonly")
invert_menu["values"] = ("反転しない", "反転する")
invert_menu.pack(fill="x")

# 実行ボタン
run_button = tk.Button(frame_right, text="実行", command=execute)
run_button.pack(pady=20)

# 結果表示
result_label = tk.Label(frame_right, text="")
result_label.pack()

material = None
root.mainloop()