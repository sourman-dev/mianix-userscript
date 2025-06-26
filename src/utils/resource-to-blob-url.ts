import { GM } from "$";

export async function resourceToBlobUrl(resourceName: string) {
    var blob = new Blob([await GM.getResourceText(resourceName)], {
        type: 'text/javascript'
    });
    // console.log('resourceToBlobUrl', resourceName, blob);
    return URL.createObjectURL(blob);
}

// Hàm giải phóng URL khi không cần nữa
export function revokeResourceBlobUrl(url: string): void {
    if (url) URL.revokeObjectURL(url);
}