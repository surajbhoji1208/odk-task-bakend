import { BaseEntity, Column, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from "typeorm";

export class BaseModifiableEntityWithoutIdentity extends BaseEntity {
    @Column({ type: "int", name: "created_by", nullable: true })
    createdBy: number;

    @Column({ type: "int", name: "updated_by", nullable: true })
    updatedBy: number;

    @Column({ type: "int", name: "deleted_by", nullable: true })
    deletedBy: number;

    @CreateDateColumn({
        type: "timestamp with time zone",
        name: "created_at",
        nullable: true
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: "timestamp with time zone",
        name: "updated_at",
        nullable: true
    })
    updatedAt: Date;

    @DeleteDateColumn({
        type: "timestamp with time zone",
        name: "deleted_at",
        nullable: true
    })
    deletedAt: Date;
}
