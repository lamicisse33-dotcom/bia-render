# Préparation hors ligne seulement. Aucune dépendance ML dans le navigateur.
# pip install mediapipe opencv-python-headless numpy
# Modèle officiel : https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
import argparse
import cv2,mediapipe as mp,numpy as np,json,math
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--model',required=True);args=parser.parse_args()
base=Path(__file__).resolve().parents[1]/'public/personnages/satin-anime-20261028'
land=mp.tasks.vision.FaceLandmarker.create_from_options(mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=args.model),num_faces=1))
tracks={};samples=[]
def analyse(frame):
 h,w=frame.shape[:2];crop=frame[:int(h*.43)];r=land.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(crop,cv2.COLOR_BGR2RGB)))
 if not r.face_landmarks:return None
 p=np.array([[l.x*w,l.y*crop.shape[0]] for l in r.face_landmarks[0]])
 a,b=p[61],p[291];c=(a+b)/2;d=b-a;mw=np.linalg.norm(d);ang=math.atan2(d[1],d[0]);gap=np.linalg.norm(p[13]-p[14])/mw
 return [round(float(v),4) for v in [*c,mw,ang,gap]]
for name in ['ecoute','parole','joie','rire','coeurs','bisou']:
 cap=cv2.VideoCapture(str(base/(name+'.mp4')));fps=cap.get(cv2.CAP_PROP_FPS);frames=[];i=0
 while True:
  ok,frame=cap.read()
  if not ok:break
  tr=analyse(frame)
  if tr is None:raise RuntimeError((name,i,'no face'))
  frames.append(tr)
  if name=='parole' and abs(tr[3])<.15:
   c=np.array(tr[:2]);mw=tr[2];ang=tr[3];dx=np.array([math.cos(ang),math.sin(ang)])*mw*1.65;dy=np.array([-math.sin(ang),math.cos(ang)])*mw*.85
   src=np.float32([c-dx/2-dy/2,c+dx/2-dy/2,c-dx/2+dy/2]);dst=np.float32([[0,0],[192,0],[0,128]])
   patch=cv2.warpAffine(frame,cv2.getAffineTransform(src,dst),(192,128),flags=cv2.INTER_CUBIC)
   samples.append((tr[4],i,patch))
  i+=1
 tracks[name]={'fps':fps,'frames':frames};print(name,len(frames),flush=True)
poster=cv2.imread(str(base/'repos.webp'));tracks['poster']={'fps':1,'frames':[analyse(poster)]}
# Eight actual mouth openings from this same person, no generated or alien lips.
ordered=sorted(samples,key=lambda s:s[0]);targets=[0,.025,.05,.08,.11,.15,.2,.25]
selected=[min(ordered,key=lambda s:abs(s[0]-t)) for t in targets]
atlas=np.concatenate([s[2] for s in selected],axis=1)
cv2.imwrite(str(base/'bouches.webp'),atlas,[cv2.IMWRITE_WEBP_QUALITY,98])
tracks['atlas']={'width':192,'height':128,'scaleX':1.65,'scaleY':.85,'ouvertures':[round(s[0],4) for s in selected],'sourceFrames':[s[1] for s in selected]}
(base/'levres.json').write_text(json.dumps(tracks,separators=(',',':')))
print('atlas',tracks['atlas'],flush=True)
