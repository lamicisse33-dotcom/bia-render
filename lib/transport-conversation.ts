/** Whole validated clips remain the route for Wolof and faithful reading. */
export function transportConversation(khalam:boolean,langue:'fr'|'wo',lecture:boolean){
 return khalam?(langue==='fr'&&!lecture?'stream-fr':'clips'):'ordinaire';
}
