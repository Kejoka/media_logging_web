<script lang="ts">
	export let title: string = '';
	export let image: string | undefined = undefined;
	
	let hoverText = title;
</script>


<div class="relative inline-block">
	<img class="block w-full transition-opacity duration-300 ease-in-out hover:opacity-50 rounded-lg" src={image} alt={title} />
	<div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 transition-opacity duration-300 ease-in-out hover:opacity-100 text-center">
		<span class="text-ellipsis overflow-hidden">{hoverText}</span>
	  </div>
</div>




