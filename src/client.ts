import { ChatroomClient, DictTopic, EventTopic, SetTopic, Topic } from "chatroom-client/src"
import { SObject } from "./sobject";
import { Constructor } from "chatroom-client/src/utils"
import { v4 as uuidv4 } from 'uuid';
import { config } from "./config";


export class ObjectSyncClient{
    private readonly chatroom;
    private readonly object_types: Map<string,Constructor<SObject>> = new Map();
    private readonly objects: Map<string,SObject> = new Map();
    private objects_topic: DictTopic<string,string>|null = null;
    private id_counter: number = 1;
    constructor(host: string,object_types?: Map<string,Constructor<SObject>>){
        this.chatroom = new ChatroomClient(host);
        this.chatroom.onConnected(() => {
            this.defineTransitions();
        });
        if(object_types){
            this.object_types = object_types;
        }
    }

    private defineTransitions(): void{
        // callbacks go brrrr

        this.objects_topic = this.chatroom.getTopic('_objects',DictTopic<string,string>);
        this.objects_topic.onAdd.add(
            (id:string, type: string) => {
                const obj = new (this.object_types.get(type)!)(this, id);
                this.objects.set(id,obj);
            }
        );
        this.objects_topic.onRemove.add(
            (id: string) => {
                const obj = this.objects.get(id)!;
                obj.onDestroy();
                this.objects.delete(id);
            }
        );

        this.chatroom.on('create_object', 
            // unpack data
            ({id,parent_id}:{'id':string,'parent_id':string}) => {
                //TODO: Simulate what the server would do

            }
        );
    }

    public addObjectType(type: string, constructor: Constructor<SObject>): void{
        this.object_types.set(type,constructor);
    }
    
    public createObject(type:string,parent:string): void{
        let id = '';
        if(config.id_method == 'increment'){
            id = (this.id_counter++).toString();
        }
        else{
            id = uuidv4().replace(/-/g,'');
        }
        this.chatroom.emit('create_object',{id:id,type:type,parent_id:parent});
    }

    public destroyObject(id:string): void{
        this.chatroom.emit('destroy_object',{id:id});
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
}