import { DictTopic, StringTopic } from "chatroom-client/src"
import { ObjectSyncClient } from "../src/client";
import { expose } from "../src/devUtils"
import { SObject } from "../src/sobject"

class RootObject extends SObject{
}

abstract class ElementObject extends SObject{
    protected abstract readonly _element: HTMLElement;
    private style = this.getAttribute('style',DictTopic<string,string>);
    constructor(objectsync: ObjectSyncClient, id: string){
        super(objectsync,id);
        this.style.onAdd.add((key:string,value:string) => {
            this._element.style.setProperty(key,value);
        });  
        this.style.onRemove.add((key:string) => {
            this._element.style.removeProperty(key);
        });
        this.style.onChangeValue.add((key:string,newValue:string) => {
            this._element.style.setProperty(key,newValue);
        });
    }
    public get element() {
        return this._element
    }
    onParentChanged(oldParent: SObject, newParent: SObject): void{
        let htmlParent = newParent;
        while(!(htmlParent instanceof ElementObject)){
            if (htmlParent.isRoot){
                document.body.appendChild(this.element);
                return;
            }
            htmlParent = htmlParent.parent;
        }
        htmlParent.element.appendChild(this.element);
    }
    onDestroy(): void{
        super.onDestroy();
        this.element.remove();
    }
}

class DivObject extends ElementObject{
    protected readonly _element = document.createElement('div')
}

class TextObject extends ElementObject{
    protected readonly _element = document.createElement('span')
    private readonly text = this.getAttribute('text',StringTopic);
    constructor(objectsync: ObjectSyncClient, id: string){
        console.log('text created',id);
        super(objectsync,id);
        this.text.onSet.add((newValue: string) => {
            this._element.innerText = newValue;
        });
    }
}

const object_types = new Map<string,typeof SObject>();
object_types.set('root',RootObject);
object_types.set('div',DivObject);
object_types.set('text',TextObject);

const client = new ObjectSyncClient('ws://localhost:8765',object_types);

expose('c', client);