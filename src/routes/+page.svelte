<script lang="ts">
    import { goto } from '$app/navigation';

    const create = () => {
        goto('/create');
    }

    const open = () => {
        goto('/designer');
    }
</script>
<div class="w-full">
    <div class="m-auto mt-80 bg-white w-200 border rounded-md shadow-lg"> 
        <div class="grid grid-cols-[auto_20rem] gap-4 w-full h-100">
            <div class="m-4 bg-[url($lib/assets/images/bg-main.jpg)] bg-cover">
               <p class="text-center text-4xl">Kim Photobooth</p>
            </div>
            <div class="my-40 flex flex-col gap-4">
                <a on:click={create()} href="javascript:void(0);">Create New</a>
                <a on:click={open()} href="javascript:void(0);">Open</a>
            </div>
        </div>
    </div>
</div>
