<script lang="ts">
	let { canPaste, hasSelection, onCreateFolder, onCopy, onCut, onPaste, onDelete, onRename } =
		$props<{
			canPaste: boolean;
			hasSelection: boolean;
			onCreateFolder: () => void;
			onCopy: () => void;
			onCut: () => void;
			onPaste: () => void;
			onDelete: () => void;
			onRename: () => void;
		}>();
</script>

<div
	class="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-gray-900/50 p-2 backdrop-blur-sm"
>
	<button
		class="flex items-center gap-2 rounded-lg bg-seko-accent px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95"
		onclick={onCreateFolder}
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
			<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
			<path
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M8 11h4m-2-2v4"
			/>
		</svg>
		New Folder
	</button>

	<div class="mx-2 h-6 w-px bg-white/10"></div>

	<button
		class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
		onclick={onCopy}
		disabled={!hasSelection}
		title="Copy"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
			<path
				fill-rule="evenodd"
				d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 0 1-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0 1 13.5 1.5H15a3 3 0 0 1 2.663 1.618ZM12 4.5A1.5 1.5 0 0 1 13.5 3H15a1.5 1.5 0 0 1 1.5 1.5H12Z"
				clip-rule="evenodd"
			/>
			<path
				d="M3 13.25C3 12.559 3.56 12 4.25 12h9.75c.69 0 1.25.559 1.25 1.25v6.75c0 .69-.56 1.25-1.25 1.25H4.25c-.69 0-1.25-.56-1.25-1.25v-6.75Z"
			/>
		</svg>
		<span>Copy</span>
	</button>

	<button
		class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
		onclick={onCut}
		disabled={!hasSelection}
		title="Cut"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
			<path
				fill-rule="evenodd"
				d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Zm8.25-3.75a.75.75 0 0 1 .75.75v2.25h2.25a.75.75 0 0 1 0 1.5h-2.25v2.25a.75.75 0 0 1-1.5 0v-2.25H7.5a.75.75 0 0 1 0-1.5h2.25V7.5a.75.75 0 0 1 .75-.75Z"
				clip-rule="evenodd"
			/>
			<!-- Using a scissors-like icon or just generic cut symbol -->
			<path
				d="M8.855 12.875a1.5 1.5 0 0 0-2.11-2.11L2.83 14.68a1.125 1.125 0 0 0 .795 1.92h1.625v4.65c0 .414.336.75.75.75h3.25a.75.75 0 0 0 .75-.75v-4.65h1.625c.801 0 1.348-.834.97-1.55l-3.74-7.175ZM15 3.75a8.25 8.25 0 0 1 6.505 13.272l-1.93-3.71A6.732 6.732 0 0 0 15 5.25a6.75 6.75 0 0 0-5.75 3.327l-1.93-3.71A8.25 8.25 0 0 1 15 3.75Z"
				opacity="0.5"
			/>
			<!-- Replaced with a cleaner Scissors icon -->
			<path
				fill-rule="evenodd"
				d="M7.78 12.2l1.378-2.651a5.003 5.003 0 0 1 1.488-1.78c.84-.57 1.847-.852 2.854-.798.549.03 1.082.162 1.58.391a3.002 3.002 0 1 1 2.41 5.503l-4.5 1.76a.75.75 0 1 1-.555-1.411l4.5-1.759a1.502 1.502 0 0 0-1.205-2.752c-.22.102-.456.16-.697.174a3.502 3.502 0 0 0-2.072.583c-.496.342-.926.791-1.258 1.314L9 15.353l3.654 1.826a.75.75 0 0 1-.67 1.342L7.756 16.4l-1.126 2.164a3.002 3.002 0 1 1-2.705-5.32l3.855-1.045Zm-2.78 2.08a1.502 1.502 0 1 0 1.353 2.66l1.22-2.348-2.573-.702Z"
				clip-rule="evenodd"
			/>
		</svg>
		<span>Cut</span>
	</button>

	<button
		class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
		onclick={onPaste}
		disabled={!canPaste}
		title="Paste"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
			<path
				fill-rule="evenodd"
				d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-1.28l-4.5-4.5a.75.75 0 0 0-1.06 0l-2 2a.75.75 0 0 0 0 1.06l4.5 4.5a.75.75 0 0 0 1.06 0l4.5-4.5a.75.75 0 0 0 0-1.06l-2-2a.75.75 0 0 0-1.06 0l-2 2a.75.75 0 0 0 0 1.06l4.5 4.5c.293.293.77.293 1.06 0l4.5-4.5a.75.75 0 0 0 0-1.06l-2-2a.75.75 0 0 0-1.06 0l-2 2a.75.75 0 0 0 0 1.06l4.5 4.5Z"
			/>
			<path
				fill-rule="evenodd"
				d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v5.25h1.5V5.25a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 .75.75v6.75h-1.5v-6H15v6h3v-6.75A1.5 1.5 0 0 0 16.5 3.75h-9Z"
				clip-rule="evenodd"
			/>
		</svg>
		<span>Paste</span>
	</button>

	<div class="mx-2 h-6 w-px bg-white/10"></div>

	<button
		class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
		onclick={onRename}
		disabled={!hasSelection}
		title="Rename"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
			<path
				d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z"
			/>
		</svg>
		<span>Rename</span>
	</button>

	<button
		class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 disabled:hover:bg-transparent"
		onclick={onDelete}
		disabled={!hasSelection}
		title="Delete"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
			<path
				fill-rule="evenodd"
				d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.636-1.452ZM12.75 14.333v4.914a.75.75 0 0 1-1.5 0v-4.914a.75.75 0 0 1 1.5 0ZM9.75 11.833V16.5a.75.75 0 0 1-1.5 0v-4.667a.75.75 0 0 1 1.5 0Zm6 0V16.5a.75.75 0 0 1-1.5 0v-4.667a.75.75 0 0 1 1.5 0Z"
				clip-rule="evenodd"
			/>
		</svg>
		<span>Delete</span>
	</button>
</div>
