import { TopicsyncClient, DictTopic, EventTopic, ListTopic, SetTopic, StringTopic, Topic } from "topicsync-client/src"
import { SObject } from "./sobject";
import { Constructor } from "topicsync-client/src/utils"
import { print } from "./devUtils"
import { IdGenerator } from "./utils"
import { ObjDictTopic, ObjListTopic, ObjSetTopic, ObjectTopic } from "./topic"


export class ObjectSyncClient{
    private readonly topicsync;
    private readonly object_types: Map<string,Constructor<SObject>> = new Map();
    private readonly objects: Map<string,SObject> = new Map();
    private objects_topic: DictTopic<string,string>|null = null;

    get clientId(): number{
        return this.topicsync.clientId;
    }
    record: (callback?: (() => void) | undefined, pretend?: boolean | undefined) => void
    clearPretendedChanges: () => void
    doAfterTransitionFinish: (callback: () => any) => void

    constructor(host: string,object_types?: Map<string,Constructor<SObject>>){
        this.topicsync = new TopicsyncClient(host);
        this.record = this.topicsync.record;
        this.clearPretendedChanges = this.topicsync.clearPretendedChanges;
        this.doAfterTransitionFinish = this.topicsync.doAfterTransitionFinish;
        this.topicsync.onConnected(() => {
            this.defineTransitions();
        });
        if(object_types){
            this.object_types = object_types;
        }
        if(!this.object_types.has('Root')){
            this.object_types.set('Root',SObject);
        }
        this.topicsync.onConnected(() => {
            IdGenerator.instance = new IdGenerator(this.clientId+'');
        });
    }

    private defineTransitions(): void{
        // callbacks go brrrr

        // This callback is only called when the event is emitted locally by this client
        // because it is not subscribed.
        this.topicsync.on('create_object',this.onCreateObject.bind(this),false);

        this.objects_topic = this.topicsync.getTopic('_objects',DictTopic<string,string>);
        this.objects_topic.onAdd.add(
            (id:string, type: string) => {
                const obj = new (this.object_types.get(type)!)(this, id);
                this.objects.set(id,obj);
                obj.postConstructor();
            }
        );
        this.objects_topic.onPop.add(
            (id: string) => {
                const obj = this.objects.get(id)!;
                obj.onDestroy();
                // Clean up attributes
                this.topicsync.allSubscribedTopics.forEach((topic: Topic<any>) => {
                    if (topic.getName().startsWith(`a/${id}/`)){
                        this.topicsync.unsubscribe(topic.getName());
                    }
                });
                this.objects.delete(id);
            }
        );
    }

    public register(constructor: Constructor<SObject>): void{
        this.addObjectType(constructor.name,constructor);
    }

    public addObjectType(type: string, constructor: Constructor<SObject>): void{
        this.object_types.set(type,constructor);
    }
    
    public createObject(type:string,parent_id:string): SObject{
        let id = IdGenerator.generateId();
        print(`Creating object ${id} of type ${type} with parent ${parent_id}`);
        this.topicsync.emit('create_object',{type:type,id:id,parent_id:parent_id});
        return this.getObject(id);
    }

    private onCreateObject({type,id,parent_id}:{type:string,id:string,parent_id:string}): void{
        this.objects_topic?.add(id,type);
        let newObject = this.objects.get(id)!;
        newObject.setParent(parent_id);
    }

    public destroyObject(id:string): void{
        this.topicsync.emit('destroy_object',{id:id});
    }

    public hasObject(id: string): boolean{
        return this.objects.has(id);
    }

    public getObject(id: string): SObject{
        if (!this.objects.has(id)){
            throw new Error(`Object ${id} does not exist`);
        }
        return this.objects.get(id)!;
    }
    public getObject_u(id: string): SObject|undefined{
        return this.objects.get(id);
    }
    /* Encapsulate TopicSync */
    public getTopic<T extends Topic<any>|ObjectTopic<any>|ObjListTopic<any>|ObjSetTopic<any>|ObjDictTopic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        let newTopic: T;
        let idToObj = (id: string)=>{
            if (this.hasObject(id))
                return this.getObject(id);
            else
                return null;
        }
        if (topicType == ObjectTopic){
            newTopic = new ObjectTopic(this.topicsync.getTopic(topicName,StringTopic),idToObj) as T;
        }
        else if (topicType == ObjListTopic){
            newTopic = new ObjListTopic(this.topicsync.getTopic(topicName,ListTopic),idToObj) as T;
        }
        else if (topicType == ObjSetTopic){
            newTopic = new ObjSetTopic(this.topicsync.getTopic(topicName,SetTopic),idToObj) as T;
        }
        else if (topicType == ObjDictTopic){
            newTopic = new ObjDictTopic(this.topicsync.getTopic(topicName,DictTopic<string,string>),idToObj) as T;
        }else{
            newTopic = this.topicsync.getTopic(topicName,topicType as any) as T
        }
        return newTopic;
    }

    public emit(topicName: string, args: any = {},sendSubscribe: boolean = false): void{
        this.topicsync.emit(topicName,args,sendSubscribe);
    }

    public on(topicName: string, callback: (args: any) => void): void{
        this.topicsync.on(topicName,callback);
    }

    public makeRequest(serviceName: string, args: any = {}){
        this.topicsync.makeRequest(serviceName,args);
    }

    public unsubscribe(topic: Topic<any>): void{
        this.topicsync.unsubscribe(topic.getName());
    }

    public undo(obj:SObject|null): void{
        if (obj)
            this.topicsync.makeRequest('undo',{id:obj.id});
        else
            this.topicsync.makeRequest('undo',{});
    }

    public redo(obj:SObject|null): void{
        if (obj)
            this.topicsync.makeRequest('redo',{id:obj.id});
        else
            this.topicsync.makeRequest('redo',{});
    }
}