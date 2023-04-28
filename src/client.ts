import { ChatroomClient, EventTopic, SetTopic, Topic } from "chatroom-client/src"
import { SObject } from "./sobject";
import { Constructor } from "chatroom-client/src/utils"

export class ObjectSyncClient{
    private readonly chatroom;
    private readonly objects: Map<number,SObject> = new Map();
    private object_ids: SetTopic|null = null;
    private createObjectEvent: EventTopic|null = null;
    constructor(host: string){
        this.chatroom = new ChatroomClient(host);
        this.chatroom.onConnected(() => {
            this.object_ids = this.chatroom.getTopic('object_ids',SetTopic);
            this.object_ids.onAppend.add(this.onObjectIdsAppend.bind(this));
            this.object_ids.onRemove.add(this.onObjectIdsRemove.bind(this));
            this.createObjectEvent = this.chatroom.getTopic('create_object',EventTopic);
        });
    }
    
    public createObject(parent:SObject): void{
        this.createObjectEvent!.emit({parent_id:parent.id});
    }

    private onObjectIdsAppend(id: number): void{
        const obj = new SObject(this, id);
        this.objects.set(id,obj);
    }
    private onObjectIdsRemove(id: number): void{
        const obj = this.objects.get(id);
        obj!.onDestroy();
        this.objects.delete(id);
    }

    /* Encapsulate ChatRoom */
    public getTopic<T extends Topic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        return this.chatroom.getTopic(topicName,topicType);
    }
    

}