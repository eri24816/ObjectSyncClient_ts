import { IntTopic, Topic, StringTopic, ListTopic, SetTopic, DictTopic } from "chatroom-client/src"
import { ObjectSyncClient } from "./client"
import { Action, Callback, Constructor } from "chatroom-client/src/utils"
import {ObjSetTopic, ObjListTopic, ObjDictTopic, ObjectTopic} from './topic';
import { print } from "./devUtils"

export class SObject{
    private readonly _id
    public get id(): string{
        return this._id;
    }
    public get parent(): SObject{
        if (this.parent_id.getValue()=='')
            return null as any;
        if (!this.objectsync.hasObject(this.parent_id.getValue())) // This happens when the parent is deleted and the child is being deleted
            return null as any;
        return this.objectsync.getObject(this.parent_id.getValue());
    }
    public get isRoot(): boolean{
        return this.id == 'root';
    }
    
    onAddChild: Action<[SObject]> = new Action();
    onRemoveChild: Action<[SObject]> = new Action();

    private _onStartCalled: boolean = false;
    get onStartCalled(): boolean{
        return this._onStartCalled;
    }
    pendingChildOnStartCalls: (() => void)[] = [];
    private topicsToInitBeforeStart: (Topic<any>|ObjectTopic<any>|ObjListTopic<any>|ObjSetTopic<any>|ObjDictTopic<any>)[] = [];

    protected readonly objectsync;
    private readonly parent_id: StringTopic;
    private readonly tags: SetTopic
    protected readonly children: Set<SObject> = new Set();
    private linkedCallbacks: {action: Action<any>, callback: Callback}[] = [];
    private linkedCallbacks2: {element: Node, eventName: string, callback: Callback}[] = [];

    constructor(objectsync: ObjectSyncClient, id: string){
        this.objectsync = objectsync;
        this._id = id;
        this.parent_id = objectsync.getTopic(`parent_id/${id}`,StringTopic);
        this.tags = objectsync.getTopic(`tags/${id}`,SetTopic);
        this.topicsToInitBeforeStart.push(this.parent_id,this.tags);
    }
    
    /**
     * Called right after the constructor.
     */
    public postConstructor(): void{
        for(let topic of this.topicsToInitBeforeStart){
            this.link(topic.onInit,this.checkOnStart);
        }

        this.objectsync.doAfterTransitionFinish(this.checkOnStart.bind(this));
    }

    private _onStart(){

        this.onStart();

        if(this.parent!=null)
            this.onParentChangedTo(this.parent)
        
        if (!this.isRoot){ 
            this.parentIdChangedCallback = this.parentIdChangedCallback.bind(this);
            this.parent_id.onSet2.add(this.parentIdChangedCallback);
        }
        
        this._onStartCalled = true;

        for(let childOnStart of this.pendingChildOnStartCalls)
            childOnStart();

        this.postStart();
    }

    /**
     * Called after init value of all attributes are loaded and the parent's onStart is called.
     */
    protected onStart(){

    }

    protected postStart(){

    }

    private checkOnStart(): void{
        if (this._onStartCalled)
            return;
        for(let topic of this.topicsToInitBeforeStart){
            if (!topic.initialized)
                return;
        }
        if(!this.isRoot && !this.parent.onStartCalled)
            // If the parent's onStart hasn't been called yet, wait for it to be called before calling onStart
            this.parent.pendingChildOnStartCalls.push(this._onStart.bind(this));
        else
            // For pretended objects, wait for the transition to finish before calling onStart
            this.objectsync.doAfterTransitionFinish(this._onStart.bind(this));
    }


    public getAttribute<T extends Topic<any>|ObjectTopic<any>|ObjListTopic<any>|ObjSetTopic<any>|ObjDictTopic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        let newTopic: T;
        if (topicType == ObjectTopic){
            newTopic = new ObjectTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,StringTopic),this.objectsync.getObject.bind(this.objectsync)) as T;
        }
        else if (topicType == ObjListTopic){
            newTopic = new ObjListTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,ListTopic),this.objectsync.getObject.bind(this.objectsync)) as T;
        }
        else if (topicType == ObjSetTopic){
            newTopic = new ObjSetTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,SetTopic),this.objectsync.getObject.bind(this.objectsync)) as T;
        }
        else if (topicType == ObjDictTopic){
            newTopic = new ObjDictTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,DictTopic<string,string>),this.objectsync.getObject.bind(this.objectsync)) as T;
        }else{
            newTopic = this.objectsync.getTopic(`a/${this.id}/${topicName}`,topicType as any) as T
        }
        this.topicsToInitBeforeStart.push(newTopic);
        return newTopic;
    }

    protected emit(name: string, args:any={}): void{
        this.objectsync.emit(`a/${this.id}/${name}`,args);
    }

    protected on(name: string, callback: Callback): void{
        this.objectsync.on(`a/${this.id}/${name}`,callback);
    }

    private parentIdChangedCallback(oldValue: string, newValue: string): void{
        //this.onParentChanged(this.objectsync.getObject_u(oldValue),this.objectsync.getObject_u(newValue));
        if(this.objectsync.getObject_u(oldValue)!=null)
            this.onParentChangedFrom(this.objectsync.getObject(oldValue));
        if(this.objectsync.getObject_u(newValue)!=null)
            this.onParentChangedTo(this.objectsync.getObject(newValue));
    }


    protected onParentChangedFrom(oldValue: SObject): void{
        oldValue.removeChild(this);
    }

    /**
     * When this object is moved to a new parent, this method is called.
     * When the object is first created, this method is called with undefined as the old parent.
     * @param oldValue 
     * @param newValue 
     */
    protected onParentChangedTo(newValue: SObject): void{
        newValue.addChild(this);
    }

    /**
     * Use this method to link a callback to an action. 
     * The callback will be automatically bound to this object.
     * The callback will be automatically removed when the object is destroyed.
     * @param action 
     * @param callback 
     */
    protected link(action: Action<any>, callback: Callback): void{ //TODO: offer remove when parent changed mode
        callback = callback.bind(this);
        this.linkedCallbacks.push({action: action, callback: callback});
        action.add(callback);
    }

    protected unlink(action: Action<any,any>): void{
        for(let i=0;i<this.linkedCallbacks.length;i++){
            if (this.linkedCallbacks[i].action == action){
                action.remove(this.linkedCallbacks[i].callback);
                this.linkedCallbacks.splice(i,1);
                return;
            }
        }
    }


    protected link2(element: Node,eventName: string , callback: Callback): void{ //TODO: offer remove when parent changed mode
        callback = callback.bind(this);
        this.linkedCallbacks2.push({element: element, eventName: eventName, callback: callback});
        element.addEventListener(eventName,callback);
    }

    protected unlink2(element: Node, eventName: string): void{
        for(let i=0;i<this.linkedCallbacks2.length;i++){
            if (this.linkedCallbacks2[i].element == element && this.linkedCallbacks2[i].eventName == eventName){
                element.removeEventListener(eventName,this.linkedCallbacks2[i].callback);
                this.linkedCallbacks2.splice(i,1);
                return;
            }
        }
    }


    onDestroy(): void{
        this.parent_id.onSet2.remove(this.parentIdChangedCallback);
        //unsubscribe from all topics
        this.objectsync.unsubscribe(this.parent_id);
        this.objectsync.unsubscribe(this.tags);
        for(let {action,callback} of this.linkedCallbacks){
            action.remove(callback);
        }
        for(let {element,eventName,callback} of this.linkedCallbacks2){
            element.removeEventListener(eventName,callback);
        }
    }

    public addChild(child: SObject): void{
        this.children.add(child);
        this.onAddChild.invoke(child);
    }

    public removeChild(child: SObject): void{
        this.onRemoveChild.invoke(child);
        this.children.delete(child);
    }

    public getChildren(): Set<SObject>{
        return this.children;
    }

    public getChildrenOfType<T extends SObject>(type: Constructor<T>): Set<T>{
        let result = new Set<T>();
        for (let child of this.children){
            if (child instanceof type)
                result.add(child);
        }
        return result;
    }

    public setParent(parent_id:string): void{
        this.parent_id.set(parent_id);
    }

    // tag stuff

    public addTag(tag: string): void{
        this.tags.append(tag);
    }
    public removeTag(tag: string): void{
        this.tags.remove(tag);
    }
    public hasTag(tag: string): boolean{
        return this.tags.getValue().indexOf(tag) != -1;
    }

}