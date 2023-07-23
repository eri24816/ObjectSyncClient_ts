import { ChatroomClient, DictTopic, EventTopic, StringTopic, Topic } from "chatroom-client/src"
import { SObject } from "./sobject";
import { Constructor } from "chatroom-client/src/utils"
import { print } from "./devUtils"
import { IdGenerator } from "./utils"


export class ObjectSyncClient{
    private readonly chatroom;
    private readonly object_types: Map<string,Constructor<SObject>> = new Map();
    private readonly objects: Map<string,SObject> = new Map();
    private objects_topic: DictTopic<string,string>|null = null;

    get clientId(): number{
        return this.chatroom.clientId;
    }
    record: (callback?: (() => void) | undefined, pretend?: boolean | undefined) => void
    clearPretendedChanges: () => void
    doAfterTransitionFinish: (callback: () => any) => void

    constructor(host: string,object_types?: Map<string,Constructor<SObject>>){
        this.chatroom = new ChatroomClient(host);
        this.record = this.chatroom.record;
        this.clearPretendedChanges = this.chatroom.clearPretendedChanges;
        this.doAfterTransitionFinish = this.chatroom.doAfterTransitionFinish;
        this.chatroom.onConnected(() => {
            this.defineTransitions();
        });
        if(object_types){
            this.object_types = object_types;
        }
        if(!this.object_types.has('Root')){
            this.object_types.set('Root',SObject);
        }
        this.chatroom.onConnected(() => {
            IdGenerator.instance = new IdGenerator(this.clientId+'');
        });
    }

    private defineTransitions(): void{
        // callbacks go brrrr
        this.getTopic('create_object',EventTopic)
        this.getTopic('destroy_object',EventTopic)

        this.chatroom.on('create_object',this.onCreateObject.bind(this));
        this.objects_topic = this.chatroom.getTopic('_objects',DictTopic<string,string>);
        this.objects_topic.onAdd.add(
            (id:string, type: string) => {
                const obj = new (this.object_types.get(type)!)(this, id);
                this.objects.set(id,obj);
                obj.postConstructor();
            }
        );
        this.objects_topic.onRemove.add(
            (id: string) => {
                const obj = this.objects.get(id)!;
                obj.onDestroy();
                // Clean up attributes
                this.chatroom.allSubscribedTopics.forEach((topic: Topic<any>) => {
                    if (topic.getName().startsWith(`a/${id}/`)){
                        this.chatroom.unsubscribe(topic.getName());
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
        this.chatroom.emit('create_object',{type:type,id:id,parent_id:parent_id});
        return this.getObject(id);
    }

    private onCreateObject({type,id,parent_id}:{type:string,id:string,parent_id:string}): void{
        this.objects_topic?.add(id,type);
        let newObject = this.objects.get(id)!;
        newObject.setParent(parent_id);
    }

    public destroyObject(id:string): void{
        this.chatroom.emit('destroy_object',{id:id});
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
    /* Encapsulate ChatRoom */
    public getTopic<T extends Topic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        return this.chatroom.getTopic(topicName,topicType);
    }

    public emit(topicName: string, args: any = {}): void{
        this.chatroom.emit(topicName,args);
    }

    public on(topicName: string, callback: (args: any) => void): void{
        this.chatroom.on(topicName,callback);
    }

    public makeRequest(serviceName: string, args: any = {}){
        this.chatroom.makeRequest(serviceName,args);
    }

    public unsubscribe(topic: Topic<any>): void{
        this.chatroom.unsubscribe(topic.getName());
    }

    public undo(obj:SObject|null): void{
        if (obj)
            this.chatroom.makeRequest('undo',{id:obj.id});
        else
            this.chatroom.makeRequest('undo',{});
    }

    public redo(obj:SObject|null): void{
        if (obj)
            this.chatroom.makeRequest('redo',{id:obj.id});
        else
            this.chatroom.makeRequest('redo',{});
    }
}