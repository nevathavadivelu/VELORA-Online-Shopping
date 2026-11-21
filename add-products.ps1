
# OnlineShopping - Add categories and products to Firestore

$projectId = "onlineshopping-e3dfe"

# Ask for the Firebase ID token without displaying it
Write-Host "Enter the ID token of the admin account used in your Firestore rules."
$secureToken = Read-Host "Firebase ID token" -AsSecureString

$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
$idToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)

if ([string]::IsNullOrWhiteSpace($idToken)) {
    throw "ID token cannot be empty."
}

$baseUrl = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents"

$headers = @{
    Authorization = "Bearer $idToken"
}

# Categories
$categories = @(
    @{
        id = "electronics"
        name = "Electronics"
        description = "Electronic devices and accessories"
    },
    @{
        id = "clothing"
        name = "Clothing"
        description = "Clothing and fashion products"
    },
    @{
        id = "home_kitchen"
        name = "Home and Kitchen"
        description = "Home essentials and kitchen products"
    },
    @{
        id = "books"
        name = "Books"
        description = "Books and educational materials"
    },
    @{
        id = "beauty"
        name = "Beauty and Personal Care"
        description = "Beauty and personal care products"
    }
)

# Products
$products = @(
    @{
        id = "wireless_headphones"
        name = "Wireless Headphones"
        description = "Comfortable wireless headphones with clear sound"
        price = 1499
        categoryId = "electronics"
        categoryName = "Electronics"
        image = "../assets/images/products/headphones.jpg"
        stock = 15
    },
    @{
        id = "smart_watch"
        name = "Smart Watch"
        description = "Smart watch for everyday use"
        price = 2499
        categoryId = "electronics"
        categoryName = "Electronics"
        image = "../assets/images/products/smartwatch.jpg"
        stock = 10
    },
    @{
        id = "usb_cable"
        name = "USB Charging Cable"
        description = "Durable USB charging cable"
        price = 299
        categoryId = "electronics"
        categoryName = "Electronics"
        image = "../assets/images/products/usb-cable.jpg"
        stock = 30
    },
    @{
        id = "cotton_tshirt"
        name = "Cotton T-Shirt"
        description = "Comfortable cotton casual T-shirt"
        price = 499
        categoryId = "clothing"
        categoryName = "Clothing"
        image = "../assets/images/products/tshirt.jpg"
        stock = 20
    },
    @{
        id = "casual_shirt"
        name = "Casual Shirt"
        description = "Stylish shirt for everyday wear"
        price = 899
        categoryId = "clothing"
        categoryName = "Clothing"
        image = "../assets/images/products/shirt.jpg"
        stock = 12
    },
    @{
        id = "water_bottle"
        name = "Water Bottle"
        description = "Reusable water bottle for daily use"
        price = 349
        categoryId = "home_kitchen"
        categoryName = "Home and Kitchen"
        image = "../assets/images/products/bottle.jpg"
        stock = 25
    },
    @{
        id = "coffee_mug"
        name = "Coffee Mug"
        description = "Ceramic mug for tea and coffee"
        price = 249
        categoryId = "home_kitchen"
        categoryName = "Home and Kitchen"
        image = "../assets/images/products/mug.jpg"
        stock = 18
    },
    @{
        id = "programming_book"
        name = "Programming Basics"
        description = "Beginner-friendly programming book"
        price = 599
        categoryId = "books"
        categoryName = "Books"
        image = "../assets/images/products/programming-book.jpg"
        stock = 8
    },
    @{
        id = "notebook"
        name = "Study Notebook"
        description = "Notebook for study and daily notes"
        price = 120
        categoryId = "books"
        categoryName = "Books"
        image = "../assets/images/products/notebook.jpg"
        stock = 40
    },
    @{
        id = "face_wash"
        name = "Face Wash"
        description = "Gentle daily facial cleanser"
        price = 199
        categoryId = "beauty"
        categoryName = "Beauty and Personal Care"
        image = "../assets/images/products/facewash.jpg"
        stock = 22
    }
)

function Save-FirestoreDocument {
    param (
        [string]$Collection,
        [string]$DocumentId,
        [hashtable]$Fields
    )

    $url = "$baseUrl/$Collection/$DocumentId"

    $body = @{
        fields = $Fields
    } | ConvertTo-Json -Depth 10

    Invoke-RestMethod `
        -Uri $url `
        -Method Patch `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body | Out-Null

    Write-Host "Added: $Collection / $DocumentId" -ForegroundColor Green
}

try {

    Write-Host "`nAdding categories..." -ForegroundColor Cyan

    foreach ($category in $categories) {

        $fields = @{
            name = @{
                stringValue = $category.name
            }
            description = @{
                stringValue = $category.description
            }
            isActive = @{
                booleanValue = $true
            }
        }

        Save-FirestoreDocument `
            -Collection "categories" `
            -DocumentId $category.id `
            -Fields $fields
    }

    Write-Host "`nAdding products..." -ForegroundColor Cyan

    foreach ($product in $products) {

        $fields = @{
            name = @{
                stringValue = $product.name
            }
            description = @{
                stringValue = $product.description
            }
            price = @{
                integerValue = "$($product.price)"
            }
            categoryId = @{
                stringValue = $product.categoryId
            }
            categoryName = @{
                stringValue = $product.categoryName
            }
            image = @{
                stringValue = $product.image
            }
            stock = @{
                integerValue = "$($product.stock)"
            }
            isActive = @{
                booleanValue = $true
            }
        }

        Save-FirestoreDocument `
            -Collection "products" `
            -DocumentId $product.id `
            -Fields $fields
    }

    Write-Host "`nSUCCESS! Categories and products were added." -ForegroundColor Green
    Write-Host "Categories added: $($categories.Count)"
    Write-Host "Products added: $($products.Count)"

}
catch {
    Write-Host "`nERROR: Could not complete the upload." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
finally {
    $idToken = $null
    $headers = $null
    $secureToken = $null
}
