export class CommonSearchResponseDto<T> {
    items: T[];
    total: number;
    pageSize: number;
    pageNumber: number;
    totalPages: number;

    constructor(items: T[], pageSize: number, pageNumber: number, total: number) {
        this.items = items;
        this.total = total;
        this.pageSize = pageSize;
        this.pageNumber = pageNumber;
        this.totalPages = Math.ceil(total / pageSize);
    }
}