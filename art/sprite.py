from PIL import Image
CHAR=[
"........OOOO..OOO.........",
"......OOHHHHOOHHHOO.......",
".....OHHLLHHHHHLHHHOO.....",
"....OHHLLHHHHHHHHHHHHO....",
"...OHHHHHHHHHHHHHHHHHHO...",
"...OHHHHHhHHHHHHHhHHHHO...",
"..OHHHHhHHHHHHHHHHhHHHHO..",
"..OHHHhHHHHhOOhHHHHhHHHO..",
"..OHHHHHHHhOSSOhhHHHhHHO..",
"..OhHHHHhOSSSSSOOhHHHHhO..",
"..OhhHHOSSSSSSSSSOOhHHhO..",
"..OhhOSSSSSSSSSSSSSSOhhO..",
"..OhOOOOOOOSSSSOOOOOOOhO..",
"..OSOSSSSSOOOOOOSSSSSOSO..",
"..OSOSSEESOSSSSOSEESSOSO..",
"..OSOSSEESOSSSSOSEESSOSO..",
"..OSOOOOOOOSSSSOOOOOOOSO..",
"..OSSBBSSSSSSSSSSSSBBSSO..",
"...OSSSSSSSSOOSSSSSSSSO...",
"....OSSSSSSSSSSSSSSSSO....",
".....OOsSSSSSSSSSSsOO.....",
".......OOOOOOOOOOOO.......",
"......OOOOCCCCCCOOOO......",
"....OONNNOCccccCONNNOO....",
"...ONNNNNNOOCCOONNNNNNO...",
"..ONNNNNNNNNOONNNNNNNNNO..",
"..ONNNNNNNNNNNNNNNNNNNNO..",
".ONNnNNNNNNNNNNNNNNNNnNNO.",
".ONNnNNNNNNNNNNNNNNNNnNNO.",
".ONNnONNNNNNNNNNNNNNOnNNO.",
".ONNnONNNNNNNNNNNNNNOnNNO.",
".ONNnONNNNNNNNNNNNNNOnNNO.",
".ONNnOnnnnnnnnnnnnnnOnNNO.",
".OOOOOOOOOOOOOOOOOOOOOOOO.",
".OSSSOPPPPPPPPPPPPPPOSSSO.",
".OSSsOPPPPPPPPPPPPPPOSsSO.",
"..OOOOPPPPPPPPPPPPPPOOOO..",
".....OPPPPPPPPPPPPPPPO....",
".....OPPPPPPPOOPPPPPPPO...",
".....OPPPPPPpOOpPPPPPPO...",
".....OPPPPPPpO.OpPPPPPO...",
".....OPPPPPPpO.OpPPPPPO...",
".....OPPPPPPpO.OpPPPPPO...",
".....OPPPPPPpO.OpPPPPPO...",
".....OPPPPPPpO.OpPPPPPO...",
".....OOOOOOOOO.OOOOOOOO...",
"....OKKKKwwwO..OwwwKKKKO..",
"....OwwwwwwwO..OwwwwwwwO..",
"....OOOOOOOOO..OOOOOOOOO..",
]
PAL={'O':(27,22,38),'E':(27,22,38),'H':(139,88,62),'h':(98,60,44),'L':(182,126,86),
'S':(244,202,162),'s':(222,164,128),'B':(236,146,132),'N':(52,76,136),'n':(34,52,100),
'C':(244,242,236),'c':(200,198,198),'P':(128,130,148),'p':(98,100,118),'K':(40,40,52),'w':(240,240,240)}
def char_img():
    W=max(len(r) for r in CHAR);H=len(CHAR)
    im=Image.new('RGBA',(W,H),(0,0,0,0))
    for y,r in enumerate(CHAR):
        for x,ch in enumerate(r):
            if ch!='.':im.putpixel((x,y),PAL[ch]+(255,))
    return im
if __name__=='__main__':
    im=char_img();print(im.size)
    bg=Image.new('RGBA',(im.width*10+20,im.height*10+20),(230,228,220,255));bg.alpha_composite(im.resize((im.width*10,im.height*10),Image.NEAREST),(10,10));bg.save('char_x10.png')
