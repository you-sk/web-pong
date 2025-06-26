// utils.js

// ヘルパー関数: ボタンのアクティブスタイルを更新
export function updateButtonStyles(activeButton, allButtons) {
    allButtons.forEach(button => {
        button.classList.remove('bg-blue-500');
        button.classList.add('bg-gray-500');
    });
    activeButton.classList.remove('bg-gray-500');
    activeButton.classList.add('bg-blue-500');
}
